import os
import pytest
from backend.app.config import Settings


def test_default_settings():
    """Settings should have sensible defaults."""
    settings = Settings()
    assert settings.app_db_path == "reports.db"
    assert settings.host == "127.0.0.1"
    assert settings.port == 9876
    assert settings.invoke_db_path is None


def test_settings_from_env(monkeypatch):
    """Settings should read from environment variables."""
    monkeypatch.setenv("INVOKE_REPORTS_PORT", "8888")
    monkeypatch.setenv("INVOKE_REPORTS_INVOKE_DB_PATH", "/some/path/invokeai.db")
    settings = Settings()
    assert settings.port == 8888
    assert settings.invoke_db_path == "/some/path/invokeai.db"
