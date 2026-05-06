from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from typing import Iterator, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.database import get_db, get_app_db_path
from backend.app.models import AppSetting, SyncHistory
from backend.routers.validate import resolve_db_path
from backend.services.importer import import_data

router = APIRouter(tags=["sync"])

_SYNC_LOCK_KEY = "sync_lock"
# A sync that's been "in progress" for longer than this is assumed crashed
# and gets stolen by the next request, so a worker death doesn't permanently
# wedge the endpoint.
_SYNC_LOCK_STALE_AFTER = timedelta(minutes=30)


@contextmanager
def _sync_lock(db: Session) -> Iterator[None]:
    """Cross-process exclusive lock for the sync endpoint, backed by a row in
    app_settings. The threading.Lock this replaces only worked under a single
    uvicorn worker — two workers had two independent locks and could run
    concurrent imports against the same SQLite file."""
    token = datetime.now(timezone.utc).isoformat()

    for _ in range(2):
        try:
            db.add(AppSetting(key=_SYNC_LOCK_KEY, value=token))
            db.commit()
            break
        except IntegrityError:
            db.rollback()
            existing: Optional[AppSetting] = db.get(AppSetting, _SYNC_LOCK_KEY)
            if existing is None:
                continue
            try:
                age = datetime.now(timezone.utc) - datetime.fromisoformat(existing.value or "")
            except ValueError:
                age = _SYNC_LOCK_STALE_AFTER
            if age <= _SYNC_LOCK_STALE_AFTER:
                raise HTTPException(status_code=409, detail="Sync already in progress")
            db.delete(existing)
            db.commit()
    else:
        raise HTTPException(status_code=409, detail="Sync already in progress")

    try:
        yield
    finally:
        held = db.get(AppSetting, _SYNC_LOCK_KEY)
        if held is not None and held.value == token:
            db.delete(held)
            db.commit()


class SyncRequest(BaseModel):
    invoke_path: str


@router.post("/sync")
def trigger_sync(req: SyncRequest, db: Session = Depends(get_db)):
    with _sync_lock(db):
        db_path = resolve_db_path(req.invoke_path.strip())
        if not db_path:
            raise HTTPException(status_code=400, detail=f"Could not find invokeai.db at {req.invoke_path}")
        app_db_path = get_app_db_path()
        return import_data(db_path, app_db_path)


@router.get("/sync/status")
def sync_status(db: Session = Depends(get_db)):
    last = db.query(SyncHistory).order_by(SyncHistory.synced_at.desc()).first()
    if not last:
        return {"last_sync": None, "source_path": None, "images_imported": None, "queue_items_imported": None}
    return {"last_sync": str(last.synced_at), "source_path": last.source_path,
            "images_imported": last.images_imported, "queue_items_imported": last.queue_items_imported}
