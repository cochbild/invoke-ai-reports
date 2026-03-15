import threading
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.database import get_db, get_app_db_path
from backend.app.models import SyncHistory
from backend.services.importer import import_data

router = APIRouter(tags=["sync"])
_sync_lock = threading.Lock()


class SyncRequest(BaseModel):
    invoke_path: str


@router.post("/sync")
def trigger_sync(req: SyncRequest, db: Session = Depends(get_db)):
    if not _sync_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="Sync already in progress")
    try:
        app_db_path = get_app_db_path()
        result = import_data(req.invoke_path, app_db_path)
        return result
    finally:
        _sync_lock.release()


@router.get("/sync/status")
def sync_status(db: Session = Depends(get_db)):
    last = db.query(SyncHistory).order_by(SyncHistory.synced_at.desc()).first()
    if not last:
        return {"last_sync": None, "source_path": None, "images_imported": None, "queue_items_imported": None}
    return {"last_sync": str(last.synced_at), "source_path": last.source_path,
            "images_imported": last.images_imported, "queue_items_imported": last.queue_items_imported}
