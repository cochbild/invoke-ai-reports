import json
import sqlite3
from datetime import datetime
from typing import Any, Optional

from sqlalchemy.orm import Session

from backend.app.database import Base, get_engine
from backend.app.models import Generation, GenerationLora, QueueItem, User, SyncHistory

_DT_FORMATS = (
    "%Y-%m-%d %H:%M:%S.%f",
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%dT%H:%M:%S.%f",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%d",
)


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

    Uses a single transaction — if anything fails, the previous data is preserved.
    """
    source_conn = sqlite3.connect(f"file:{invoke_db_path}?mode=ro", uri=True)
    source_conn.row_factory = sqlite3.Row
    try:
        return _do_import(source_conn, app_db_path, invoke_db_path)
    finally:
        source_conn.close()


def _do_import(source_conn: sqlite3.Connection, app_db_path: str, source_path: str) -> dict[str, int]:
    engine = get_engine(app_db_path)
    Base.metadata.create_all(engine)
    images_imported = 0
    queue_items_imported = 0

    with Session(engine) as session:
        # Delete and re-import in a single transaction
        session.query(GenerationLora).delete()
        session.query(Generation).delete()
        session.query(QueueItem).delete()
        session.query(User).delete()

        cursor = source_conn.execute(
            "SELECT image_name, user_id, created_at, width, height, metadata, starred, has_workflow FROM images"
        )
        for row in cursor:
            metadata_str = row["metadata"]
            metadata = json.loads(metadata_str) if metadata_str else None
            parsed = parse_image_metadata(metadata)
            width = (metadata.get("width") if metadata else None) or row["width"]
            height = (metadata.get("height") if metadata else None) or row["height"]

            gen = Generation(
                image_name=row["image_name"], user_id=row["user_id"],
                created_at=_parse_dt(row["created_at"]), generation_mode=parsed["generation_mode"],
                model_name=parsed["model_name"], model_base=parsed["model_base"],
                model_key=parsed["model_key"],
                positive_prompt=parsed["positive_prompt"],
                negative_prompt=parsed["negative_prompt"],
                width=width, height=height,
                seed=metadata.get("seed") if metadata else None,
                steps=parsed["steps"], cfg_scale=parsed["cfg_scale"],
                scheduler=parsed["scheduler"],
                starred=bool(row["starred"]) if row["starred"] is not None else None,
                has_workflow=bool(row["has_workflow"]) if row["has_workflow"] is not None else None,
            )
            session.add(gen)
            session.flush()
            for lora in parsed["loras"]:
                session.add(GenerationLora(
                    generation_id=gen.id, lora_name=lora["name"], lora_weight=lora["weight"],
                ))
            images_imported += 1

        cursor = source_conn.execute(
            """SELECT batch_id, session_id, session, status, created_at,
                      started_at, completed_at, error_type, error_message, user_id
               FROM session_queue"""
        )
        for row in cursor:
            session_str = row["session"]
            session_data = json.loads(session_str) if session_str else None
            model_name, model_base = parse_session_model(session_data)
            session.add(QueueItem(
                user_id=row["user_id"], batch_id=row["batch_id"],
                session_id=row["session_id"], model_name=model_name,
                model_base=model_base, status=row["status"],
                created_at=_parse_dt(row["created_at"]),
                started_at=_parse_dt(row["started_at"]),
                completed_at=_parse_dt(row["completed_at"]),
                error_type=row["error_type"],
                error_message=row["error_message"],
            ))
            queue_items_imported += 1

        user_cursor = source_conn.execute("SELECT user_id, display_name FROM users")
        for row in user_cursor:
            user_id = row["user_id"]
            count = session.query(Generation).filter_by(user_id=user_id).count()
            session.add(User(
                user_id=user_id, display_name=row["display_name"], image_count=count,
            ))

        session.add(SyncHistory(
            source_path=source_path, synced_at=datetime.now(),
            images_imported=images_imported, queue_items_imported=queue_items_imported,
        ))
        session.commit()

    source_conn.close()
    return {"images_imported": images_imported, "queue_items_imported": queue_items_imported}
