from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session


class Base(DeclarativeBase):
    pass


def get_engine(db_path: str = "reports.db"):
    """Create SQLAlchemy engine for the app database."""
    return create_engine(f"sqlite:///{db_path}", echo=False)


def get_session(db_path: str = "reports.db"):
    """Create a new database session."""
    engine = get_engine(db_path)
    return Session(engine)


from backend.app.config import get_settings  # noqa: E402

_app_db_path: str | None = None


def set_app_db_path(path: str):
    global _app_db_path
    _app_db_path = path


def get_app_db_path() -> str:
    if _app_db_path:
        return _app_db_path
    return get_settings().app_db_path


def get_db():
    engine = get_engine(get_app_db_path())
    with Session(engine) as session:
        yield session
