import os
import tempfile
from datetime import datetime
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from backend.app.database import Base, get_engine, get_session


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
