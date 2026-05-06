from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_prefix": "INVOKE_REPORTS_"}

    app_db_path: str = "reports.db"
    invoke_db_path: Optional[str] = None
    host: str = "127.0.0.1"
    port: int = 9876
    # Allow the Vite dev server (5173) to call the API. Off by default; set
    # INVOKE_REPORTS_DEV_CORS=1 when running `npm run dev` against this backend.
    dev_cors: bool = False


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
