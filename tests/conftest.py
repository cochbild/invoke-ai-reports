import os
import tempfile
from datetime import datetime
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from backend.app.database import Base, get_engine, get_session
import backend.app.models  # noqa: F401 — registers all ORM models on Base.metadata
from backend.app.models import Generation, GenerationLora, QueueItem, User, SyncHistory


@pytest.fixture
def tmp_db_path(tmp_path):
    """Return a path for a temporary SQLite database."""
    return str(tmp_path / "test_reports.db")


@pytest.fixture
def engine(tmp_db_path):
    """Create a test database engine and initialize tables."""
    eng = get_engine(tmp_db_path)
    Base.metadata.create_all(eng)
    return eng


@pytest.fixture
def db_session(engine):
    """Provide a transactional database session for tests."""
    with Session(engine) as session:
        yield session
        session.rollback()


@pytest.fixture
def seeded_db(db_session):
    """Database seeded with realistic test data for analytics."""
    db_session.add(User(user_id="user-1", display_name="Alice", image_count=5))
    db_session.add(User(user_id="user-2", display_name="Bob", image_count=3))

    test_generations = [
        Generation(image_name="img-001", user_id="user-1", created_at=datetime(2026, 1, 10, 10, 0),
                   generation_mode="sdxl_txt2img", model_name="Juggernaut XL v9", model_base="sdxl",
                   positive_prompt="cat, sitting, cute, fluffy", negative_prompt="ugly",
                   width=1024, height=1024, seed=1, steps=30, cfg_scale=7.5, scheduler="dpmpp_3m_k",
                   starred=True, has_workflow=False),
        Generation(image_name="img-002", user_id="user-1", created_at=datetime(2026, 1, 10, 14, 0),
                   generation_mode="sdxl_txt2img", model_name="Juggernaut XL v9", model_base="sdxl",
                   positive_prompt="dog, running, park, sunny", negative_prompt="blurry",
                   width=1024, height=768, seed=2, steps=25, cfg_scale=7.0, scheduler="euler",
                   starred=False, has_workflow=False),
        Generation(image_name="img-003", user_id="user-1", created_at=datetime(2026, 1, 15, 9, 0),
                   generation_mode="sdxl_txt2img", model_name="perfectdeliberate_v70", model_base="sdxl",
                   positive_prompt="landscape, mountains, sunset, golden hour", negative_prompt="",
                   width=1344, height=768, seed=3, steps=20, cfg_scale=5.0, scheduler="dpmpp_3m_k",
                   starred=False, has_workflow=True),
        Generation(image_name="img-004", user_id="user-1", created_at=datetime(2026, 2, 1, 11, 0),
                   generation_mode="flux_txt2img", model_name="flux1Dev", model_base="flux",
                   positive_prompt="cat, portrait, studio lighting", negative_prompt="",
                   width=1024, height=1024, seed=4, steps=20, cfg_scale=1.0, scheduler="euler",
                   starred=True, has_workflow=False),
        Generation(image_name="img-005", user_id="user-1", created_at=datetime(2026, 2, 5, 16, 30),
                   generation_mode="flux_txt2img", model_name="flux1Dev", model_base="flux",
                   positive_prompt="dog, beach, sunset", negative_prompt="",
                   width=1024, height=1024, seed=5, steps=20, cfg_scale=1.0, scheduler="euler",
                   starred=False, has_workflow=False),
        Generation(image_name="img-006", user_id="user-2", created_at=datetime(2026, 1, 12, 8, 0),
                   generation_mode="sdxl_txt2img", model_name="Juggernaut XL v9", model_base="sdxl",
                   positive_prompt="cat, cute, anime style", negative_prompt="ugly, blurry",
                   width=1024, height=1024, seed=6, steps=30, cfg_scale=7.5, scheduler="dpmpp_3m_k",
                   starred=False, has_workflow=False),
        Generation(image_name="img-007", user_id="user-2", created_at=datetime(2026, 2, 10, 20, 0),
                   generation_mode="z_image_txt2img", model_name="Z-Image Turbo", model_base="z-image",
                   positive_prompt="landscape, fantasy, castle", negative_prompt="",
                   width=1024, height=1024, seed=7, steps=4, cfg_scale=1.0, scheduler="euler",
                   starred=True, has_workflow=False),
        Generation(image_name="img-008", user_id="user-2", created_at=datetime(2026, 2, 15, 12, 0),
                   generation_mode="flux_txt2img", model_name="flux1Dev", model_base="flux",
                   positive_prompt="portrait, woman, natural light", negative_prompt="",
                   width=768, height=1024, seed=8, steps=20, cfg_scale=1.0, scheduler="euler",
                   starred=False, has_workflow=False),
    ]
    for gen in test_generations:
        db_session.add(gen)
    db_session.flush()

    gen1 = db_session.query(Generation).filter_by(image_name="img-001").first()
    db_session.add(GenerationLora(generation_id=gen1.id, lora_name="JuggerCineXL2", lora_weight=0.75))
    db_session.add(GenerationLora(generation_id=gen1.id, lora_name="DetailTweaker", lora_weight=0.5))
    gen6 = db_session.query(Generation).filter_by(image_name="img-006").first()
    db_session.add(GenerationLora(generation_id=gen6.id, lora_name="JuggerCineXL2", lora_weight=0.6))

    db_session.add(QueueItem(user_id="user-1", batch_id="b1", session_id="s1", model_name="Juggernaut XL v9",
                             model_base="sdxl", status="completed",
                             created_at=datetime(2026, 1, 10, 10, 0),
                             started_at=datetime(2026, 1, 10, 10, 0, 1),
                             completed_at=datetime(2026, 1, 10, 10, 0, 15)))
    db_session.add(QueueItem(user_id="user-1", batch_id="b2", session_id="s2", model_name="flux1Dev",
                             model_base="flux", status="completed",
                             created_at=datetime(2026, 2, 1, 11, 0),
                             started_at=datetime(2026, 2, 1, 11, 0, 1),
                             completed_at=datetime(2026, 2, 1, 11, 0, 20)))
    db_session.add(QueueItem(user_id="user-2", batch_id="b3", session_id="s3", model_name="Juggernaut XL v9",
                             model_base="sdxl", status="failed",
                             created_at=datetime(2026, 1, 12, 8, 0),
                             error_type="ModelNotFound", error_message="Model not available"))

    db_session.add(SyncHistory(source_path="/invokeai", synced_at=datetime(2026, 3, 1), images_imported=8, queue_items_imported=3))
    db_session.commit()
    return db_session
