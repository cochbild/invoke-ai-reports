import os
import platform
import re
import sqlite3
from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["validate"])


def _normalize_path(user_path: str) -> str:
    """Normalize a user-provided path for the current platform.

    Handles cross-platform scenarios:
    - Windows path (G:\\InvokeUi) entered when server runs on WSL → /mnt/g/InvokeUi
    - WSL path (/mnt/g/InvokeUi) entered when server runs on Windows → G:\\InvokeUi
    - Forward/backslash normalization
    """
    path = user_path.strip().rstrip("/\\")
    is_wsl = platform.system() == "Linux" and os.path.exists("/proc/version")

    # Windows drive letter path (e.g. G:\path or G:/path) on WSL
    win_drive = re.match(r"^([A-Za-z]):[/\\](.*)", path)
    if win_drive and is_wsl:
        drive = win_drive.group(1).lower()
        rest = win_drive.group(2).replace("\\", "/")
        return f"/mnt/{drive}/{rest}"

    # WSL mount path on Windows
    wsl_mount = re.match(r"^/mnt/([a-z])/(.*)", path)
    if wsl_mount and platform.system() == "Windows":
        drive = wsl_mount.group(1).upper()
        rest = wsl_mount.group(2).replace("/", "\\")
        return f"{drive}:\\{rest}"

    # Normalize separators for current platform
    if platform.system() == "Windows":
        return path.replace("/", "\\")

    return path.replace("\\", "/")


def resolve_db_path(user_path: str) -> str | None:
    """Try to locate invokeai.db from a user-provided path.

    Accepts:
    - Main install dir (path/databases/invokeai.db)
    - The databases dir directly (path/invokeai.db)
    - Exact file path to the .db file
    """
    normalized = _normalize_path(user_path)
    candidates = [
        os.path.join(normalized, "databases", "invokeai.db"),
        os.path.join(normalized, "invokeai.db"),
        normalized,
    ]
    for candidate in candidates:
        if os.path.isfile(candidate):
            return candidate
    return None


class ValidateRequest(BaseModel):
    path: str


@router.post("/validate-path")
def validate_path(req: ValidateRequest):
    db_path = resolve_db_path(req.path)
    if not db_path:
        normalized = _normalize_path(req.path)
        return {"valid": False, "error": f"Could not find invokeai.db. Looked in: {normalized}/databases/ and {normalized}/"}
    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        cursor = conn.execute("SELECT COUNT(*) FROM images")
        image_count = cursor.fetchone()[0]
        cursor = conn.execute("SELECT COUNT(DISTINCT user_id) FROM images")
        user_count = cursor.fetchone()[0]
        cursor = conn.execute(
            "SELECT COUNT(DISTINCT json_extract(metadata, '$.model.name')) "
            "FROM images WHERE metadata IS NOT NULL AND json_extract(metadata, '$.model.name') IS NOT NULL"
        )
        model_count = cursor.fetchone()[0]

        conn.close()
        return {"valid": True, "image_count": image_count, "user_count": user_count, "model_count": model_count}
    except Exception as e:
        return {"valid": False, "error": str(e)}
