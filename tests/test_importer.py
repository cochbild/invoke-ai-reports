import json
import sqlite3
import pytest
from datetime import datetime
from sqlalchemy.orm import Session

from backend.app.database import Base, get_engine
from backend.app.models import Generation, GenerationLora, QueueItem, User, SyncHistory
from backend.services.importer import import_data, parse_image_metadata, parse_session_model


@pytest.fixture
def invoke_db(tmp_path):
    db_path = str(tmp_path / "invokeai.db")
    conn = sqlite3.connect(db_path)
    conn.execute("""CREATE TABLE images (
        image_name TEXT PRIMARY KEY, image_origin TEXT NOT NULL DEFAULT 'internal',
        image_category TEXT NOT NULL DEFAULT 'general', width INTEGER NOT NULL DEFAULT 1024,
        height INTEGER NOT NULL DEFAULT 1024, session_id TEXT, node_id TEXT,
        metadata TEXT, is_intermediate BOOLEAN DEFAULT 0,
        created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL,
        deleted_at DATETIME, starred BOOLEAN DEFAULT 0,
        has_workflow BOOLEAN DEFAULT 0, user_id TEXT DEFAULT 'system')""")
    conn.execute("""CREATE TABLE session_queue (
        item_id INTEGER PRIMARY KEY, batch_id TEXT NOT NULL,
        queue_id TEXT NOT NULL DEFAULT 'default', session_id TEXT NOT NULL,
        field_values TEXT, session TEXT NOT NULL, status TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 0, error_traceback TEXT,
        created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL,
        started_at DATETIME, completed_at DATETIME, workflow TEXT,
        error_type TEXT, error_message TEXT, origin TEXT, destination TEXT,
        retried_from_item_id INTEGER, user_id TEXT DEFAULT 'system')""")
    conn.execute("""CREATE TABLE users (
        user_id TEXT PRIMARY KEY, email TEXT NOT NULL DEFAULT '',
        display_name TEXT, password_hash TEXT NOT NULL DEFAULT '',
        is_admin BOOLEAN NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL,
        last_login_at DATETIME)""")

    metadata = json.dumps({
        "generation_mode": "sdxl_txt2img",
        "model": {"key": "abc-123", "name": "Juggernaut XL v9", "base": "sdxl", "type": "main"},
        "positive_prompt": "a beautiful sunset, mountains, golden hour",
        "negative_prompt": "ugly, blurry", "width": 1024, "height": 1024,
        "seed": 12345, "steps": 30, "cfg_scale": 7.5, "scheduler": "dpmpp_3m_k",
        "loras": [{"model": {"name": "JuggerCineXL2", "base": "sdxl"}, "weight": 0.75}],
    })
    conn.execute("INSERT INTO images (image_name, created_at, updated_at, metadata, starred, has_workflow, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ("img-001.png", "2026-01-15 10:30:00", "2026-01-15 10:30:00", metadata, 0, 0, "system"))
    conn.execute("INSERT INTO images (image_name, created_at, updated_at, metadata, user_id) VALUES (?, ?, ?, ?, ?)",
        ("img-002.png", "2026-01-16 10:30:00", "2026-01-16 10:30:00", None, "system"))
    conn.execute("INSERT INTO images (image_name, created_at, updated_at, metadata, user_id) VALUES (?, ?, ?, ?, ?)",
        ("img-003.png", "2026-01-17 10:30:00", "2026-01-17 10:30:00", "{}", "system"))

    session_json = json.dumps({"id": "session-001", "graph": {"nodes": {
        "model_loader": {"type": "sdxl_model_loader", "model": {"name": "Juggernaut XL v9", "base": "sdxl"}}}}})
    conn.execute("INSERT INTO session_queue (batch_id,session_id,session,status,created_at,updated_at,started_at,completed_at,user_id) VALUES (?,?,?,?,?,?,?,?,?)",
        ("batch-001", "session-001", session_json, "completed", "2026-01-15 10:30:00", "2026-01-15 10:30:15", "2026-01-15 10:30:01", "2026-01-15 10:30:15", "system"))
    conn.execute("INSERT INTO session_queue (batch_id,session_id,session,status,created_at,updated_at,error_type,error_message,user_id) VALUES (?,?,?,?,?,?,?,?,?)",
        ("batch-002", "session-002", "{}", "failed", "2026-01-15 11:00:00", "2026-01-15 11:00:05", "ModelNotFound", "Model xyz not found", "system"))

    conn.execute("INSERT INTO users (user_id,email,display_name,password_hash,created_at,updated_at) VALUES (?,?,?,?,?,?)",
        ("system", "system@system.invokeai", "System User", "hash", "2026-01-01", "2026-01-01"))
    conn.commit()
    conn.close()
    return db_path


@pytest.fixture
def app_db_path(tmp_path):
    return str(tmp_path / "reports.db")


def test_parse_image_metadata():
    metadata = {
        "generation_mode": "sdxl_txt2img",
        "model": {"key": "abc", "name": "TestModel", "base": "sdxl"},
        "positive_prompt": "hello world", "negative_prompt": "ugly",
        "steps": 20, "cfg_scale": 7.0, "scheduler": "euler",
        "loras": [{"model": {"name": "LoRA1"}, "weight": 0.5}],
    }
    result = parse_image_metadata(metadata)
    assert result["generation_mode"] == "sdxl_txt2img"
    assert result["model_name"] == "TestModel"
    assert result["model_base"] == "sdxl"
    assert result["model_key"] == "abc"
    assert result["positive_prompt"] == "hello world"
    assert result["steps"] == 20
    assert result["loras"] == [{"name": "LoRA1", "weight": 0.5}]


def test_parse_image_metadata_empty():
    result = parse_image_metadata({})
    assert result["model_name"] is None
    assert result["loras"] == []
    result = parse_image_metadata(None)
    assert result["model_name"] is None


def test_parse_session_model():
    session = {"graph": {"nodes": {"model_loader": {"type": "sdxl_model_loader", "model": {"name": "TestModel", "base": "sdxl"}}}}}
    name, base = parse_session_model(session)
    assert name == "TestModel"
    assert base == "sdxl"


def test_parse_session_model_no_model():
    name, base = parse_session_model({})
    assert name is None
    assert base is None


def test_import_data_full(invoke_db, app_db_path):
    result = import_data(invoke_db, app_db_path)
    assert result["images_imported"] == 3
    assert result["queue_items_imported"] == 2
    engine = get_engine(app_db_path)
    with Session(engine) as session:
        gens = session.query(Generation).all()
        assert len(gens) == 3
        gen = session.query(Generation).filter_by(image_name="img-001.png").first()
        assert gen.model_name == "Juggernaut XL v9"
        assert gen.model_base == "sdxl"
        assert gen.steps == 30
        assert gen.positive_prompt == "a beautiful sunset, mountains, golden hour"
        loras = session.query(GenerationLora).all()
        assert len(loras) == 1
        assert loras[0].lora_name == "JuggerCineXL2"
        assert loras[0].lora_weight == 0.75
        items = session.query(QueueItem).all()
        assert len(items) == 2
        completed = session.query(QueueItem).filter_by(status="completed").first()
        assert completed.model_name == "Juggernaut XL v9"
        failed = session.query(QueueItem).filter_by(status="failed").first()
        assert failed.error_type == "ModelNotFound"
        users = session.query(User).all()
        assert len(users) == 1
        assert users[0].display_name == "System User"
        assert users[0].image_count == 3
        syncs = session.query(SyncHistory).all()
        assert len(syncs) == 1
        assert syncs[0].images_imported == 3


def test_import_data_idempotent(invoke_db, app_db_path):
    import_data(invoke_db, app_db_path)
    import_data(invoke_db, app_db_path)
    engine = get_engine(app_db_path)
    with Session(engine) as session:
        assert session.query(Generation).count() == 3
        assert session.query(SyncHistory).count() == 2
