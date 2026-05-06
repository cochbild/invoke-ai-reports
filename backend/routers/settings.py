import secrets
import time
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import SyncHistory, Generation, GenerationLora, QueueItem, User, AppSetting

router = APIRouter(tags=["settings"])

# Single-use, short-TTL tokens that gate the destructive /clear endpoint.
# Held in-process — fine for a single-worker app; resets on restart.
_CLEAR_TOKEN_TTL_SECONDS = 60
_clear_tokens: dict[str, float] = {}


def _issue_clear_token() -> str:
    token = secrets.token_urlsafe(32)
    _clear_tokens[token] = time.monotonic() + _CLEAR_TOKEN_TTL_SECONDS
    # Opportunistic cleanup of expired tokens
    now = time.monotonic()
    for k in [k for k, exp in _clear_tokens.items() if exp < now]:
        _clear_tokens.pop(k, None)
    return token


def _consume_clear_token(token: str) -> bool:
    expiry = _clear_tokens.pop(token, None)
    return expiry is not None and expiry >= time.monotonic()


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


@router.post("/settings/clear-token")
def request_clear_token():
    """Issue a short-lived token that authorizes one /settings/clear call."""
    return {"token": _issue_clear_token(), "ttl_seconds": _CLEAR_TOKEN_TTL_SECONDS}


class ClearRequest(BaseModel):
    confirmation_token: str


@router.post("/settings/clear")
def clear_data(req: ClearRequest, db: Session = Depends(get_db)):
    """Wipe all imported data. Requires a token from /settings/clear-token."""
    if not _consume_clear_token(req.confirmation_token):
        raise HTTPException(status_code=403, detail="Invalid or expired confirmation token")
    db.query(GenerationLora).delete()
    db.query(Generation).delete()
    db.query(QueueItem).delete()
    db.query(User).delete()
    db.query(SyncHistory).delete()
    db.query(AppSetting).delete()
    db.commit()
    return {"status": "cleared"}
