from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import SyncHistory, Generation, GenerationLora, QueueItem, User, AppSetting

router = APIRouter(tags=["settings"])


def _get_setting(db: Session, key: str) -> Optional[str]:
    row = db.query(AppSetting).filter_by(key=key).first()
    return row.value if row else None


def _set_setting(db: Session, key: str, value: str):
    row = db.query(AppSetting).filter_by(key=key).first()
    if row:
        row.value = value
    else:
        db.add(AppSetting(key=key, value=value))
    db.commit()


class SettingsUpdate(BaseModel):
    invoke_path: Optional[str] = None


@router.get("/settings")
def get_current_settings(db: Session = Depends(get_db)):
    last_sync = db.query(SyncHistory).order_by(SyncHistory.synced_at.desc()).first()
    return {"invoke_path": _get_setting(db, "invoke_path"),
            "last_sync": str(last_sync.synced_at) if last_sync else None}


@router.put("/settings")
def update_settings(update: SettingsUpdate, db: Session = Depends(get_db)):
    if update.invoke_path is not None:
        _set_setting(db, "invoke_path", update.invoke_path)
    return {"invoke_path": _get_setting(db, "invoke_path")}


@router.post("/settings/clear")
def clear_data(db: Session = Depends(get_db)):
    db.query(GenerationLora).delete()
    db.query(Generation).delete()
    db.query(QueueItem).delete()
    db.query(User).delete()
    db.query(SyncHistory).delete()
    db.query(AppSetting).delete()
    db.commit()
    return {"status": "cleared"}
