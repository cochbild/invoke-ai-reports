import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.database import Base, get_engine, get_db
from backend.app.models import Generation, User, SyncHistory, AppSetting
from backend.app.main import app


@pytest.fixture
def client(tmp_path):
    """Create a test client with a fresh database."""
    db_path = str(tmp_path / "test.db")
    engine = get_engine(db_path)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        session.add(SyncHistory(
            source_path="/test/path",
            synced_at=datetime(2026, 3, 1, 12, 0),
            images_imported=5,
            queue_items_imported=2,
        ))
        session.add(User(user_id="user-1", display_name="Alice", image_count=3))
        session.add(Generation(
            image_name="img-001", user_id="user-1",
            created_at=datetime(2026, 1, 10, 10, 0),
        ))
        session.commit()

    def override_get_db():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_get_settings_returns_current(client):
    """GET /api/settings should return current settings (invoke_path and last_sync)."""
    resp = client.get("/api/settings")
    assert resp.status_code == 200
    data = resp.json()
    assert "invoke_path" in data
    assert "last_sync" in data
    assert data["last_sync"] is not None


def test_update_settings_invoke_path(client):
    """PUT /api/settings should persist the invoke_path."""
    resp = client.put("/api/settings", json={"invoke_path": "/new/invoke/path"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["invoke_path"] == "/new/invoke/path"

    # Verify it persists across requests
    resp2 = client.get("/api/settings")
    assert resp2.json()["invoke_path"] == "/new/invoke/path"


def test_clear_data_removes_all_records(client):
    """POST /api/settings/clear should remove all data tables."""
    resp = client.post("/api/settings/clear")
    assert resp.status_code == 200
    assert resp.json()["status"] == "cleared"

    # Verify no users or sync history remain
    users_resp = client.get("/api/users")
    assert users_resp.json() == []

    settings_resp = client.get("/api/settings")
    assert settings_resp.json()["last_sync"] is None
