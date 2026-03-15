import json
import sqlite3
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.database import Base, get_engine, get_db, set_app_db_path
from backend.app.main import app


def make_invoke_db(path: str):
    """Create a minimal InvokeAI-style SQLite database for testing."""
    conn = sqlite3.connect(path)
    conn.execute("""
        CREATE TABLE images (
            image_name TEXT PRIMARY KEY,
            user_id TEXT,
            created_at TEXT,
            width INTEGER,
            height INTEGER,
            metadata TEXT,
            starred INTEGER,
            has_workflow INTEGER
        )
    """)
    conn.execute("""
        CREATE TABLE session_queue (
            batch_id TEXT,
            session_id TEXT,
            session TEXT,
            status TEXT,
            created_at TEXT,
            started_at TEXT,
            completed_at TEXT,
            error_type TEXT,
            error_message TEXT,
            user_id TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE users (
            user_id TEXT PRIMARY KEY,
            display_name TEXT
        )
    """)
    meta = json.dumps({
        "model": {"name": "TestModel", "base": "sdxl", "key": "abc"},
        "positive_prompt": "a cat",
        "steps": 20,
        "cfg_scale": 7.0,
        "scheduler": "euler",
        "width": 1024,
        "height": 1024,
    })
    conn.execute(
        "INSERT INTO images VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        ("img-test-001", "user-test", "2026-01-01 10:00:00", 1024, 1024, meta, 0, 0),
    )
    conn.execute(
        "INSERT INTO users VALUES (?, ?)",
        ("user-test", "Test User"),
    )
    conn.commit()
    conn.close()


@pytest.fixture
def invoke_path(tmp_path):
    """Create a fake InvokeAI databases directory."""
    db_dir = tmp_path / "databases"
    db_dir.mkdir()
    db_file = db_dir / "invokeai.db"
    make_invoke_db(str(db_file))
    return str(db_file)


@pytest.fixture
def test_app_db(tmp_path):
    """Set up an isolated app database and return the path."""
    app_db = str(tmp_path / "test_app.db")
    set_app_db_path(app_db)
    engine = get_engine(app_db)
    Base.metadata.create_all(engine)
    return app_db


@pytest.fixture
def client(test_app_db):
    """Create a test client with the DB dependency overridden."""
    engine = get_engine(test_app_db)

    def override_get_db():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_sync_imports_data(client, invoke_path):
    """POST /api/sync should import images and return counts."""
    # invoke_path is the full path to the DB file; the router passes it directly
    # but import_data expects the db file path, and the router uses req.invoke_path
    # which is passed as-is to import_data. Adjust: the router expects the directory
    # containing 'databases/invokeai.db', but the actual import_data call uses
    # req.invoke_path directly as the source db path.
    # Looking at the router: import_data(req.invoke_path, app_db_path)
    # And importer: source_conn = sqlite3.connect(f"file:{invoke_db_path}?mode=ro", uri=True)
    # So req.invoke_path should be the direct path to the invokeai.db file.
    resp = client.post("/api/sync", json={"invoke_path": invoke_path})
    assert resp.status_code == 200
    data = resp.json()
    assert data["images_imported"] == 1
    assert data["queue_items_imported"] == 0


def test_sync_status_after_import(client, invoke_path):
    """After a sync, GET /api/sync/status should show the last sync."""
    client.post("/api/sync", json={"invoke_path": invoke_path})
    resp = client.get("/api/sync/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["last_sync"] is not None
    assert data["images_imported"] == 1


def test_sync_status_before_any_import(client):
    """Before any sync, GET /api/sync/status should return nulls."""
    resp = client.get("/api/sync/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["last_sync"] is None
    assert data["images_imported"] is None
