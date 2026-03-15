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
