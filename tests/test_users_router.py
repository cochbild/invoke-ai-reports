import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.database import Base, get_engine, get_db
from backend.app.models import User
from backend.app.main import app


@pytest.fixture
def client(tmp_path):
    """Create a test client with seeded user data."""
    db_path = str(tmp_path / "test.db")
    engine = get_engine(db_path)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        session.add(User(user_id="user-1", display_name="Alice", image_count=10))
        session.add(User(user_id="user-2", display_name="Bob", image_count=5))
        session.add(User(user_id="user-3", display_name="Charlie", image_count=20))
        session.commit()

    def override_get_db():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_list_users_returns_all(client):
    """GET /api/users should return all users."""
    resp = client.get("/api/users")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 3
    assert all("user_id" in u and "display_name" in u and "image_count" in u for u in data)


def test_list_users_sorted_by_image_count(client):
    """Users should be sorted descending by image_count."""
    resp = client.get("/api/users")
    assert resp.status_code == 200
    data = resp.json()
    counts = [u["image_count"] for u in data]
    assert counts == sorted(counts, reverse=True)
    assert data[0]["user_id"] == "user-3"
    assert data[0]["image_count"] == 20
