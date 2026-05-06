from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session


class Base(DeclarativeBase):
    pass


@lru_cache(maxsize=None)
def get_engine(db_path: str = "reports.db"):
    """Return a SQLAlchemy engine for the app database, cached per db_path."""
    return create_engine(f"sqlite:///{db_path}", echo=False)


def get_session(db_path: str = "reports.db"):
    """Create a new database session bound to the cached engine."""
    return Session(get_engine(db_path))


from backend.app.config import get_settings  # noqa: E402

_app_db_path: str | None = None


def set_app_db_path(path: str):
    global _app_db_path
    _app_db_path = path


def get_app_db_path() -> str:
    if _app_db_path:
        return _app_db_path
    return get_settings().app_db_path


def reset_db_state():
    """Test helper: clear the cached engine and the per-process db path so a
    test starts from a known state. Safe to call between tests; never called
    in production paths."""
    global _app_db_path
    _app_db_path = None
    get_engine.cache_clear()


def get_db():
    with Session(get_engine(get_app_db_path())) as session:
        yield session
