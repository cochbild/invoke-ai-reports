from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_prefix": "INVOKE_REPORTS_"}

    app_db_path: str = "reports.db"
    invoke_db_path: Optional[str] = None
    host: str = "127.0.0.1"
    port: int = 9876


def get_settings() -> Settings:
    return Settings()
