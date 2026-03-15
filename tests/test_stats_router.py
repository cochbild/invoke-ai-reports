import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.database import Base, get_engine, get_db
from backend.app.models import Generation, GenerationLora, QueueItem, User, SyncHistory
from backend.app.main import app


@pytest.fixture
def client(tmp_path):
    """Create a test client with seeded analytics data."""
    db_path = str(tmp_path / "test.db")
    engine = get_engine(db_path)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        session.add(User(user_id="user-1", display_name="Alice", image_count=5))
        session.add(User(user_id="user-2", display_name="Bob", image_count=3))

        gens = [
            Generation(image_name="img-001", user_id="user-1", created_at=datetime(2026, 1, 10, 10, 0),
                       model_name="ModelA", model_base="sdxl", positive_prompt="cat fluffy cute",
                       width=1024, height=1024, steps=30, cfg_scale=7.5, scheduler="euler"),
            Generation(image_name="img-002", user_id="user-1", created_at=datetime(2026, 1, 15, 12, 0),
                       model_name="ModelA", model_base="sdxl", positive_prompt="dog park sunny",
                       width=1024, height=768, steps=25, cfg_scale=7.0, scheduler="dpmpp_3m_k"),
            Generation(image_name="img-003", user_id="user-1", created_at=datetime(2026, 2, 5, 9, 0),
                       model_name="ModelB", model_base="flux", positive_prompt="landscape mountains golden",
                       width=1344, height=768, steps=20, cfg_scale=1.0, scheduler="euler"),
            Generation(image_name="img-004", user_id="user-2", created_at=datetime(2026, 2, 10, 14, 0),
                       model_name="ModelA", model_base="sdxl", positive_prompt="portrait woman light",
                       width=1024, height=1024, steps=30, cfg_scale=7.5, scheduler="euler"),
            Generation(image_name="img-005", user_id="user-2", created_at=datetime(2026, 3, 1, 20, 0),
                       model_name="ModelC", model_base="z-image", positive_prompt="fantasy castle magic",
                       width=1024, height=1024, steps=4, cfg_scale=1.0, scheduler="euler"),
        ]
        for g in gens:
            session.add(g)
        session.flush()

        gen1 = session.query(Generation).filter_by(image_name="img-001").first()
        session.add(GenerationLora(generation_id=gen1.id, lora_name="LoraA", lora_weight=0.8))
        gen4 = session.query(Generation).filter_by(image_name="img-004").first()
        session.add(GenerationLora(generation_id=gen4.id, lora_name="LoraA", lora_weight=0.6))

        session.add(QueueItem(user_id="user-1", batch_id="b1", session_id="s1",
                              model_name="ModelA", model_base="sdxl", status="completed",
                              created_at=datetime(2026, 1, 10, 10, 0)))
        session.add(QueueItem(user_id="user-2", batch_id="b2", session_id="s2",
                              model_name="ModelB", model_base="flux", status="failed",
                              created_at=datetime(2026, 2, 5, 9, 0),
                              error_type="OOMError", error_message="Out of memory"))

        session.commit()

    def override_get_db():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_overview(client):
    resp = client.get("/api/stats/overview")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_images"] == 5
    assert data["models_used"] == 3
    assert data["top_model"] == "ModelA"


def test_top_models(client):
    resp = client.get("/api/stats/models/top")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert data[0]["model_name"] == "ModelA"
    assert data[0]["count"] == 3


def test_least_models(client):
    resp = client.get("/api/stats/models/least")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    # least-used models should have count <= top models
    assert data[0]["count"] <= data[-1]["count"]


def test_family_distribution(client):
    resp = client.get("/api/stats/models/family-distribution")
    assert resp.status_code == 200
    data = resp.json()
    bases = {d["model_base"] for d in data}
    assert "sdxl" in bases
    assert "flux" in bases


def test_leaderboard(client):
    resp = client.get("/api/stats/models/leaderboard")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert "model_name" in data[0]
    assert "count" in data[0]
    assert "avg_steps" in data[0]


def test_prompt_top_tokens(client):
    resp = client.get("/api/stats/prompts/top-tokens")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


def test_prompt_length_distribution(client):
    resp = client.get("/api/stats/prompts/length-distribution")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    # All items have bucket and count
    assert all("bucket" in d and "count" in d for d in data)


def test_volume_trend(client):
    resp = client.get("/api/stats/trends/volume")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert all("period" in d and "count" in d for d in data)


def test_activity_heatmap(client):
    resp = client.get("/api/stats/trends/heatmap")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert all("day_of_week" in d and "hour" in d and "count" in d for d in data)


def test_parameter_trends(client):
    resp = client.get("/api/stats/trends/parameters")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert all("period" in d for d in data)


def test_resolutions(client):
    resp = client.get("/api/stats/generation/resolutions")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert all("resolution" in d and "count" in d for d in data)


def test_schedulers(client):
    resp = client.get("/api/stats/generation/schedulers")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    schedulers = {d["scheduler"] for d in data}
    assert "euler" in schedulers


def test_steps_distribution(client):
    resp = client.get("/api/stats/generation/steps")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert all("steps" in d and "count" in d for d in data)


def test_cfg_distribution(client):
    resp = client.get("/api/stats/generation/cfg")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert all("cfg_scale" in d and "count" in d for d in data)


def test_loras(client):
    resp = client.get("/api/stats/generation/loras")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_with_lora" in data
    assert data["total_with_lora"] == 2
    assert data["top_loras"][0]["lora_name"] == "LoraA"


def test_errors(client):
    resp = client.get("/api/stats/generation/errors")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_items"] == 2
    assert data["total_failed"] == 1
    assert len(data["by_error_type"]) == 1
    assert data["by_error_type"][0]["error_type"] == "OOMError"
