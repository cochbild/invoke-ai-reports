from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import User

router = APIRouter(tags=["users"])


@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.image_count.desc()).all()
    return [{"user_id": u.user_id, "display_name": u.display_name, "image_count": u.image_count} for u in users]
