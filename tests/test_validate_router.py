import json
import sqlite3
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def valid_invoke_path(tmp_path):
    """Create a valid InvokeAI directory structure with an images table."""
    db_dir = tmp_path / "databases"
    db_dir.mkdir()
    db_file = db_dir / "invokeai.db"
    conn = sqlite3.connect(str(db_file))
    conn.execute("""
        CREATE TABLE images (
            image_name TEXT PRIMARY KEY,
            user_id TEXT,
            metadata TEXT
        )
    """)
    meta = json.dumps({"model": {"name": "TestModel", "base": "sdxl"}})
    conn.execute("INSERT INTO images VALUES (?, ?, ?)", ("img-001", "user-1", meta))
    conn.execute("INSERT INTO images VALUES (?, ?, ?)", ("img-002", "user-1", None))
    conn.commit()
    conn.close()
    return str(tmp_path)


def test_validate_valid_path(client, valid_invoke_path):
    """A path with a proper invokeai.db should return valid=True with counts."""
    resp = client.post("/api/validate-path", json={"path": valid_invoke_path})
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["image_count"] == 2
    assert data["user_count"] == 1
    assert data["model_count"] == 1


def test_validate_invalid_path(client, tmp_path):
    """A path with no databases/invokeai.db should return valid=False."""
    resp = client.post("/api/validate-path", json={"path": str(tmp_path)})
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is False
    assert "error" in data


def test_validate_path_without_db(client, tmp_path):
    """A path with the databases directory but no invokeai.db should return valid=False."""
    db_dir = tmp_path / "databases"
    db_dir.mkdir()
    resp = client.post("/api/validate-path", json={"path": str(tmp_path)})
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is False
