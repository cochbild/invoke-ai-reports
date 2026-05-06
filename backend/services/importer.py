import json
import sqlite3
from datetime import datetime
from typing import Any, Iterable, Optional

from sqlalchemy import func
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from backend.app.database import Base, get_engine
from backend.app.models import Generation, GenerationLora, QueueItem, User, SyncHistory, AppSetting

_WATERMARK_IMAGES = "source_images_updated_at"
_WATERMARK_QUEUE = "source_queue_updated_at"
_SYNC_HISTORY_KEEP = 50

_DT_FORMATS = (
    "%Y-%m-%d %H:%M:%S.%f",
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%dT%H:%M:%S.%f",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%d",
)

_BATCH_SIZE = 1000


def _parse_dt(value: Any) -> Optional[datetime]:
    """Convert a string datetime from SQLite to a Python datetime, or return None."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    for fmt in _DT_FORMATS:
        try:
            return datetime.strptime(str(value), fmt)
        except ValueError:
            continue
    return None


def parse_image_metadata(metadata: Optional[dict]) -> dict[str, Any]:
    if not metadata:
        return {
            "generation_mode": None, "model_name": None, "model_base": None,
            "model_key": None, "positive_prompt": None, "negative_prompt": None,
            "steps": None, "cfg_scale": None, "scheduler": None, "loras": [],
        }
    model = metadata.get("model") or {}
    loras_raw = metadata.get("loras") or []
    loras = []
    for lora in loras_raw:
        lora_model = lora.get("model") or {}
        loras.append({"name": lora_model.get("name"), "weight": lora.get("weight", 0.0)})
    return {
        "generation_mode": metadata.get("generation_mode"),
        "model_name": model.get("name"), "model_base": model.get("base"),
        "model_key": model.get("key"),
        "positive_prompt": metadata.get("positive_prompt"),
        "negative_prompt": metadata.get("negative_prompt"),
        "steps": metadata.get("steps"), "cfg_scale": metadata.get("cfg_scale"),
        "scheduler": metadata.get("scheduler"), "loras": loras,
    }


def parse_session_model(session_data: Optional[dict]) -> tuple[Optional[str], Optional[str]]:
    if not session_data:
        return None, None
    graph = session_data.get("graph") or {}
    nodes = graph.get("nodes") or {}
    for node_id, node in nodes.items():
        node_type = node.get("type", "")
        if "model_loader" in node_type:
            model = node.get("model") or {}
            name = model.get("name")
            base = model.get("base")
            if name:
                return name, base
    return None, None


def import_data(invoke_db_path: str, app_db_path: str) -> dict[str, int]:
    """Import data from InvokeAI's database into the app database.

    Incremental: only rows newer than the watermark stored in the app DB are
    pulled from the source. Upsert by `image_name` makes re-runs safe.
    """
    source_conn = sqlite3.connect(f"file:{invoke_db_path}?mode=ro", uri=True)
    source_conn.row_factory = sqlite3.Row
    try:
        return _do_import(source_conn, app_db_path, invoke_db_path)
    finally:
        source_conn.close()


def _get_watermark(session: Session, key: str) -> Optional[str]:
    row = session.query(AppSetting).filter_by(key=key).first()
    return row.value if row else None


def _set_watermark(session: Session, key: str, value: str):
    row = session.query(AppSetting).filter_by(key=key).first()
    if row:
        row.value = value
    else:
        session.add(AppSetting(key=key, value=value))


def _prune_sync_history(session: Session):
    """Keep only the most recent _SYNC_HISTORY_KEEP rows. Reads the module
    attribute at call time so tests can monkeypatch it."""
    from sqlalchemy import select
    keep_ids = select(SyncHistory.id).order_by(
        SyncHistory.synced_at.desc()
    ).limit(_SYNC_HISTORY_KEEP).scalar_subquery()
    session.query(SyncHistory).filter(SyncHistory.id.notin_(keep_ids)).delete(
        synchronize_session=False
    )


def _do_import(source_conn: sqlite3.Connection, app_db_path: str, source_path: str) -> dict[str, int]:
    engine = get_engine(app_db_path)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        # Watermark on source.updated_at, not created_at — created_at can't detect
        # in-place mutations to existing rows. Stored in AppSetting because
        # Generation/QueueItem don't carry source.updated_at.
        gen_watermark = _get_watermark(session, _WATERMARK_IMAGES)
        queue_watermark = _get_watermark(session, _WATERMARK_QUEUE)

        images_imported, new_gen_wm = _import_images(source_conn, session, gen_watermark)
        queue_items_imported, new_queue_wm = _import_queue_items(source_conn, session, queue_watermark)
        _refresh_users(source_conn, session)

        if new_gen_wm:
            _set_watermark(session, _WATERMARK_IMAGES, new_gen_wm)
        if new_queue_wm:
            _set_watermark(session, _WATERMARK_QUEUE, new_queue_wm)

        session.add(SyncHistory(
            source_path=source_path, synced_at=datetime.now(),
            images_imported=images_imported, queue_items_imported=queue_items_imported,
        ))
        _prune_sync_history(session)
        session.commit()

    return {"images_imported": images_imported, "queue_items_imported": queue_items_imported}


def _import_images(
    source: sqlite3.Connection, session: Session, watermark: Optional[str]
) -> tuple[int, Optional[str]]:
    base_sql = ("SELECT image_name, user_id, created_at, updated_at, width, height, metadata, "
                "starred, has_workflow FROM images")
    if watermark:
        cursor = source.execute(base_sql + " WHERE updated_at >= ?", (watermark,))
    else:
        cursor = source.execute(base_sql)

    gen_batch: list[dict] = []
    lora_groups: list[tuple[str, list[dict]]] = []
    total = 0
    max_updated_at: Optional[str] = watermark

    for row in cursor:
        row_updated = row["updated_at"]
        if row_updated and (max_updated_at is None or str(row_updated) > max_updated_at):
            max_updated_at = str(row_updated)
        metadata_str = row["metadata"]
        metadata = json.loads(metadata_str) if metadata_str else None
        parsed = parse_image_metadata(metadata)
        width = (metadata.get("width") if metadata else None) or row["width"]
        height = (metadata.get("height") if metadata else None) or row["height"]

        gen_batch.append({
            "image_name": row["image_name"], "user_id": row["user_id"],
            "created_at": _parse_dt(row["created_at"]),
            "generation_mode": parsed["generation_mode"],
            "model_name": parsed["model_name"], "model_base": parsed["model_base"],
            "model_key": parsed["model_key"],
            "positive_prompt": parsed["positive_prompt"],
            "negative_prompt": parsed["negative_prompt"],
            "width": width, "height": height,
            "seed": metadata.get("seed") if metadata else None,
            "steps": parsed["steps"], "cfg_scale": parsed["cfg_scale"],
            "scheduler": parsed["scheduler"],
            "starred": bool(row["starred"]) if row["starred"] is not None else None,
            "has_workflow": bool(row["has_workflow"]) if row["has_workflow"] is not None else None,
        })
        if parsed["loras"]:
            lora_groups.append((row["image_name"], parsed["loras"]))
        total += 1

        if len(gen_batch) >= _BATCH_SIZE:
            _flush_images(session, gen_batch, lora_groups)
            gen_batch, lora_groups = [], []

    if gen_batch:
        _flush_images(session, gen_batch, lora_groups)

    return total, max_updated_at


def _flush_images(session: Session, gen_rows: list[dict], lora_groups: list[tuple[str, list[dict]]]):
    # Upsert generations by image_name. On conflict, refresh every column except
    # the primary key and the conflict key itself.
    stmt = sqlite_insert(Generation).values(gen_rows)
    update_cols = {c.name: c for c in stmt.excluded if c.name not in ("id", "image_name")}
    stmt = stmt.on_conflict_do_update(index_elements=["image_name"], set_=update_cols)
    session.execute(stmt)

    # Resolve image_name -> generation_id for every row in this batch. We need
    # the IDs even for images with no new LoRAs because re-imports may need to
    # *clear* LoRAs that were dropped from the source metadata.
    all_image_names = [g["image_name"] for g in gen_rows]
    id_map = dict(
        session.query(Generation.image_name, Generation.id)
        .filter(Generation.image_name.in_(all_image_names)).all()
    )
    all_gen_ids = list(id_map.values())
    if all_gen_ids:
        session.query(GenerationLora).filter(
            GenerationLora.generation_id.in_(all_gen_ids)
        ).delete(synchronize_session=False)

    if not lora_groups:
        return

    lora_rows = []
    for image_name, loras in lora_groups:
        gen_id = id_map.get(image_name)
        if gen_id is None:
            continue
        for lora in loras:
            if not lora.get("name"):
                continue
            lora_rows.append({
                "generation_id": gen_id,
                "lora_name": lora["name"],
                "lora_weight": lora.get("weight") or 0.0,
            })
    if lora_rows:
        session.execute(sqlite_insert(GenerationLora).values(lora_rows))


def _import_queue_items(
    source: sqlite3.Connection, session: Session, watermark: Optional[str]
) -> tuple[int, Optional[str]]:
    base_sql = ("""SELECT batch_id, session_id, session, status, created_at, updated_at,
                          started_at, completed_at, error_type, error_message, user_id
                   FROM session_queue""")
    if watermark:
        cursor = source.execute(base_sql + " WHERE updated_at >= ?", (watermark,))
    else:
        cursor = source.execute(base_sql)

    batch: list[dict] = []
    total = 0
    max_updated_at: Optional[str] = watermark

    for row in cursor:
        row_updated = row["updated_at"]
        if row_updated and (max_updated_at is None or str(row_updated) > max_updated_at):
            max_updated_at = str(row_updated)

        session_str = row["session"]
        session_data = json.loads(session_str) if session_str else None
        model_name, model_base = parse_session_model(session_data)
        batch.append({
            "user_id": row["user_id"], "batch_id": row["batch_id"],
            "session_id": row["session_id"], "model_name": model_name,
            "model_base": model_base, "status": row["status"],
            "created_at": _parse_dt(row["created_at"]),
            "started_at": _parse_dt(row["started_at"]),
            "completed_at": _parse_dt(row["completed_at"]),
            "error_type": row["error_type"],
            "error_message": row["error_message"],
        })
        total += 1

        if len(batch) >= _BATCH_SIZE:
            _flush_queue_items(session, batch, watermark is not None)
            batch = []

    if batch:
        _flush_queue_items(session, batch, watermark is not None)

    return total, max_updated_at


def _flush_queue_items(session: Session, rows: list[dict], incremental: bool):
    # session_queue has no natural unique key in our schema. On a fresh import
    # we just insert; on incremental sync the watermark filter re-fetches
    # the boundary row, so dedupe by (session_id, status) before insert.
    if incremental:
        existing = {
            (sid, status) for sid, status in session.query(
                QueueItem.session_id, QueueItem.status
            ).filter(QueueItem.session_id.in_({r["session_id"] for r in rows if r["session_id"]})).all()
        }
        rows = [r for r in rows if (r["session_id"], r["status"]) not in existing]
        if not rows:
            return
    session.execute(sqlite_insert(QueueItem).values(rows))


def _refresh_users(source: sqlite3.Connection, session: Session):
    """Refresh the User table from source + recompute image_count in one query."""
    counts = dict(
        session.query(Generation.user_id, func.count(Generation.id))
        .group_by(Generation.user_id).all()
    )

    user_rows = []
    for row in source.execute("SELECT user_id, display_name FROM users"):
        user_rows.append({
            "user_id": row["user_id"],
            "display_name": row["display_name"],
            "image_count": counts.get(row["user_id"], 0),
        })

    if not user_rows:
        return

    stmt = sqlite_insert(User).values(user_rows)
    stmt = stmt.on_conflict_do_update(
        index_elements=["user_id"],
        set_={"display_name": stmt.excluded.display_name,
              "image_count": stmt.excluded.image_count},
    )
    session.execute(stmt)
