import json
import os
import sqlite3
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["validate"])


class ValidateRequest(BaseModel):
    path: str


@router.post("/validate-path")
def validate_path(req: ValidateRequest):
    db_path = os.path.join(req.path, "databases", "invokeai.db")
    if not os.path.isfile(db_path):
        return {"valid": False, "error": "Database not found at expected location"}
    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        cursor = conn.execute("SELECT COUNT(*) FROM images")
        image_count = cursor.fetchone()[0]
        cursor = conn.execute("SELECT COUNT(DISTINCT user_id) FROM images")
        user_count = cursor.fetchone()[0]
        cursor = conn.execute("SELECT metadata FROM images WHERE metadata IS NOT NULL LIMIT 1000")
        models = set()
        for row in cursor:
            try:
                meta = json.loads(row[0])
                model = meta.get("model", {})
                if model and model.get("name"):
                    models.add(model["name"])
            except (json.JSONDecodeError, TypeError):
                pass
        conn.close()
        return {"valid": True, "image_count": image_count, "user_count": user_count, "model_count": len(models)}
    except Exception as e:
        return {"valid": False, "error": str(e)}
