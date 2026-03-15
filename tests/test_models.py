from sqlalchemy import text


def test_engine_connects(engine):
    """Engine should connect and execute queries."""
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        assert result.scalar() == 1


def test_tables_created(engine):
    """All app tables should exist after create_all."""
    from backend.app.database import Base
    table_names = set(Base.metadata.tables.keys())
    assert "generations" in table_names
    assert "generation_loras" in table_names
    assert "queue_items" in table_names
    assert "users" in table_names
    assert "sync_history" in table_names
    assert "app_settings" in table_names


from datetime import datetime
import pytest
from backend.app.models import Generation, GenerationLora, QueueItem, User, SyncHistory


def test_insert_generation(db_session):
    """Should insert and retrieve a generation record."""
    gen = Generation(
        image_name="test-image-001.png",
        user_id="system",
        created_at=datetime(2026, 1, 15, 10, 30, 0),
        generation_mode="sdxl_txt2img",
        model_name="Juggernaut XL v9",
        model_base="sdxl",
        model_key="abc-123",
        positive_prompt="a beautiful landscape",
        negative_prompt="ugly, blurry",
        width=1024,
        height=1024,
        seed=12345,
        steps=30,
        cfg_scale=7.5,
        scheduler="dpmpp_3m_k",
        starred=False,
        has_workflow=False,
    )
    db_session.add(gen)
    db_session.commit()

    result = db_session.query(Generation).filter_by(image_name="test-image-001.png").first()
    assert result is not None
    assert result.model_name == "Juggernaut XL v9"
    assert result.model_base == "sdxl"
    assert result.steps == 30
    assert result.cfg_scale == 7.5


def test_insert_generation_lora(db_session):
    """Should insert a LoRA linked to a generation."""
    gen = Generation(
        image_name="test-lora-001.png",
        user_id="system",
        created_at=datetime(2026, 1, 15, 10, 30, 0),
        generation_mode="sdxl_txt2img",
        model_name="Juggernaut XL v9",
        model_base="sdxl",
    )
    db_session.add(gen)
    db_session.flush()

    lora = GenerationLora(
        generation_id=gen.id,
        lora_name="JuggerCineXL2",
        lora_weight=0.75,
    )
    db_session.add(lora)
    db_session.commit()

    result = db_session.query(GenerationLora).filter_by(generation_id=gen.id).first()
    assert result is not None
    assert result.lora_name == "JuggerCineXL2"
    assert result.lora_weight == 0.75


def test_insert_queue_item(db_session):
    """Should insert and retrieve a queue item."""
    item = QueueItem(
        user_id="system",
        batch_id="batch-001",
        session_id="session-001",
        model_name="Juggernaut XL v9",
        model_base="sdxl",
        status="completed",
        created_at=datetime(2026, 1, 15, 10, 30, 0),
        started_at=datetime(2026, 1, 15, 10, 30, 1),
        completed_at=datetime(2026, 1, 15, 10, 30, 15),
    )
    db_session.add(item)
    db_session.commit()

    result = db_session.query(QueueItem).filter_by(session_id="session-001").first()
    assert result is not None
    assert result.status == "completed"


def test_insert_user(db_session):
    """Should insert and retrieve a user."""
    user = User(
        user_id="system",
        display_name="System User",
        image_count=100,
    )
    db_session.add(user)
    db_session.commit()

    result = db_session.query(User).filter_by(user_id="system").first()
    assert result is not None
    assert result.display_name == "System User"
    assert result.image_count == 100


def test_insert_sync_history(db_session):
    """Should insert and retrieve a sync history record."""
    sync = SyncHistory(
        source_path="/path/to/invokeai",
        synced_at=datetime(2026, 1, 15, 10, 30, 0),
        images_imported=14590,
        queue_items_imported=17141,
    )
    db_session.add(sync)
    db_session.commit()

    result = db_session.query(SyncHistory).first()
    assert result is not None
    assert result.images_imported == 14590


def test_generation_unique_image_name(db_session):
    """image_name should be unique — duplicate insert should fail."""
    gen1 = Generation(image_name="dup.png", user_id="system", created_at=datetime(2026, 1, 1))
    db_session.add(gen1)
    db_session.commit()

    gen2 = Generation(image_name="dup.png", user_id="system", created_at=datetime(2026, 1, 2))
    db_session.add(gen2)
    with pytest.raises(Exception):
        db_session.commit()
