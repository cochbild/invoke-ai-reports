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
