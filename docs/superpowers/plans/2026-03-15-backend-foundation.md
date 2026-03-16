# Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Python/FastAPI backend — database models, importer, and all REST API endpoints — fully testable with pytest.

**Architecture:** FastAPI app with SQLAlchemy ORM against a local `reports.db` SQLite database. An importer reads InvokeAI's `invokeai.db` in read-only mode, parses JSON metadata, and flattens it into denormalized tables. All analytics queries run against `reports.db`, never the source database.

**Tech Stack:** Python 3.10+, FastAPI, SQLAlchemy 2.0, SQLite, pytest, uvicorn

---

## File Structure

```
invoke-ai-reports/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app factory, CORS, static file mount
│   │   ├── config.py            # Settings via pydantic-settings (DB paths, port)
│   │   ├── database.py          # SQLAlchemy engine, session, Base
│   │   └── models.py            # All SQLAlchemy ORM models
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── sync.py              # POST /api/sync, GET /api/sync/status
│   │   ├── users.py             # GET /api/users
│   │   ├── stats.py             # All /api/stats/* endpoints
│   │   ├── settings.py          # GET/PUT /api/settings, POST /api/settings/clear
│   │   └── validate.py          # POST /api/validate-path
│   ├── services/
│   │   ├── __init__.py
│   │   ├── importer.py          # Read invokeai.db → write reports.db
│   │   ├── analytics.py         # Core stat computation (model stats, generation stats, trends)
│   │   └── prompt_analyzer.py   # Tokenize & analyze prompts
│   └── __init__.py
├── tests/
│   ├── conftest.py              # Fixtures: test DB, sample data, FastAPI test client
│   ├── test_models.py           # ORM model tests
│   ├── test_importer.py         # Importer logic tests
│   ├── test_prompt_analyzer.py  # Prompt tokenization tests
│   ├── test_analytics.py        # Analytics service tests
│   ├── test_sync_router.py      # Sync endpoint tests
│   ├── test_users_router.py     # Users endpoint tests
│   ├── test_stats_router.py     # Stats endpoint tests
│   ├── test_settings_router.py  # Settings endpoint tests
│   └── test_validate_router.py  # Validate endpoint tests
├── pyproject.toml               # Project metadata, deps, CLI entry point
└── .gitignore
```

---

## Chunk 1: Project Scaffolding & Database Models

### Task 1: Project Setup

**Files:**
- Create: `pyproject.toml`
- Create: `.gitignore`
- Create: `backend/__init__.py`
- Create: `backend/app/__init__.py`
- Create: `backend/routers/__init__.py`
- Create: `backend/services/__init__.py`

- [ ] **Step 1: Create pyproject.toml**

```toml
[build-system]
requires = ["setuptools>=68.0", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "invoke-ai-reports"
version = "0.1.0"
description = "Analytics dashboard for InvokeAI image generation data"
requires-python = ">=3.10"
dependencies = [
    "fastapi>=0.104.0",
    "uvicorn[standard]>=0.24.0",
    "sqlalchemy>=2.0.0",
    "pydantic>=2.0.0",
    "pydantic-settings>=2.0.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "pytest-asyncio>=0.21.0",
    "httpx>=0.25.0",
]

[project.scripts]
invoke-ai-reports = "backend.app.main:run"

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
```

- [ ] **Step 2: Create .gitignore**

```
__pycache__/
*.pyc
*.pyo
*.egg-info/
dist/
build/
*.db
.venv/
venv/
.env
node_modules/
frontend/dist/
.pytest_cache/
```

- [ ] **Step 3: Create package __init__.py files**

Create empty `__init__.py` in:
- `backend/__init__.py`
- `backend/app/__init__.py`
- `backend/routers/__init__.py`
- `backend/services/__init__.py`

- [ ] **Step 4: Install project in dev mode**

```bash
python -m venv .venv
source .venv/Scripts/activate  # Windows Git Bash
pip install -e ".[dev]"
```

- [ ] **Step 5: Verify pytest runs (no tests yet, should show "no tests ran")**

```bash
pytest -v
```
Expected: `no tests ran` with exit code 5

- [ ] **Step 6: Commit**

```bash
git add pyproject.toml .gitignore backend/__init__.py backend/app/__init__.py backend/routers/__init__.py backend/services/__init__.py
git commit -m "chore: scaffold Python project structure with dependencies"
```

---

### Task 2: Configuration

**Files:**
- Create: `backend/app/config.py`
- Create: `tests/test_config.py`

- [ ] **Step 1: Write config tests**

```python
# tests/test_config.py
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_config.py -v
```
Expected: FAIL — `ModuleNotFoundError: No module named 'backend.app.config'`

- [ ] **Step 3: Implement config**

```python
# backend/app/config.py
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_config.py -v
```
Expected: 2 passed

- [ ] **Step 5: Commit**

```bash
git add backend/app/config.py tests/test_config.py
git commit -m "feat: add configuration with pydantic-settings"
```

---

### Task 3: Database Engine & Session

**Files:**
- Create: `backend/app/database.py`
- Create: `tests/conftest.py`

- [ ] **Step 1: Write conftest with DB fixtures**

```python
# tests/conftest.py
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
```

- [ ] **Step 2: Write database module tests**

```python
# tests/test_models.py
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
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pytest tests/test_models.py -v
```
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 4: Implement database module (engine + session only, models in next task)**

```python
# backend/app/database.py
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
```

Note: Tests will still fail because models haven't been defined yet. That's expected — Task 4 adds the models.

- [ ] **Step 5: Commit**

```bash
git add backend/app/database.py tests/conftest.py tests/test_models.py
git commit -m "feat: add database engine, session factory, and test fixtures"
```

---

### Task 4: SQLAlchemy ORM Models

**Files:**
- Create: `backend/app/models.py`
- Modify: `tests/test_models.py` (add model insertion tests)

- [ ] **Step 1: Add model tests to test_models.py**

Append to `tests/test_models.py`:

```python
from datetime import datetime
from backend.app.models import Generation, GenerationLora, QueueItem, User, SyncHistory


def test_insert_generation(db_session):
    """Should insert and retrieve a generation record."""
    gen = Generation(
        image_name="test-image-001.png",
        user_id="system",
        created_at=datetime(2026, 1, 15, 10, 30, 0),
        generation_mode="sdxl_txt2img",
        model_name="Juggernaut XL v9",
        model_base="sdxl",
        model_key="abc-123",
        positive_prompt="a beautiful landscape",
        negative_prompt="ugly, blurry",
        width=1024,
        height=1024,
        seed=12345,
        steps=30,
        cfg_scale=7.5,
        scheduler="dpmpp_3m_k",
        starred=False,
        has_workflow=False,
    )
    db_session.add(gen)
    db_session.commit()

    result = db_session.query(Generation).filter_by(image_name="test-image-001.png").first()
    assert result is not None
    assert result.model_name == "Juggernaut XL v9"
    assert result.model_base == "sdxl"
    assert result.steps == 30
    assert result.cfg_scale == 7.5


def test_insert_generation_lora(db_session):
    """Should insert a LoRA linked to a generation."""
    gen = Generation(
        image_name="test-lora-001.png",
        user_id="system",
        created_at=datetime(2026, 1, 15, 10, 30, 0),
        generation_mode="sdxl_txt2img",
        model_name="Juggernaut XL v9",
        model_base="sdxl",
    )
    db_session.add(gen)
    db_session.flush()

    lora = GenerationLora(
        generation_id=gen.id,
        lora_name="JuggerCineXL2",
        lora_weight=0.75,
    )
    db_session.add(lora)
    db_session.commit()

    result = db_session.query(GenerationLora).filter_by(generation_id=gen.id).first()
    assert result is not None
    assert result.lora_name == "JuggerCineXL2"
    assert result.lora_weight == 0.75


def test_insert_queue_item(db_session):
    """Should insert and retrieve a queue item."""
    item = QueueItem(
        user_id="system",
        batch_id="batch-001",
        session_id="session-001",
        model_name="Juggernaut XL v9",
        model_base="sdxl",
        status="completed",
        created_at=datetime(2026, 1, 15, 10, 30, 0),
        started_at=datetime(2026, 1, 15, 10, 30, 1),
        completed_at=datetime(2026, 1, 15, 10, 30, 15),
    )
    db_session.add(item)
    db_session.commit()

    result = db_session.query(QueueItem).filter_by(session_id="session-001").first()
    assert result is not None
    assert result.status == "completed"


def test_insert_user(db_session):
    """Should insert and retrieve a user."""
    user = User(
        user_id="system",
        display_name="System User",
        image_count=100,
    )
    db_session.add(user)
    db_session.commit()

    result = db_session.query(User).filter_by(user_id="system").first()
    assert result is not None
    assert result.display_name == "System User"
    assert result.image_count == 100


def test_insert_sync_history(db_session):
    """Should insert and retrieve a sync history record."""
    sync = SyncHistory(
        source_path="/path/to/invokeai",
        synced_at=datetime(2026, 1, 15, 10, 30, 0),
        images_imported=14590,
        queue_items_imported=17141,
    )
    db_session.add(sync)
    db_session.commit()

    result = db_session.query(SyncHistory).first()
    assert result is not None
    assert result.images_imported == 14590


def test_generation_unique_image_name(db_session):
    """image_name should be unique — duplicate insert should fail."""
    gen1 = Generation(image_name="dup.png", user_id="system", created_at=datetime(2026, 1, 1))
    db_session.add(gen1)
    db_session.commit()

    gen2 = Generation(image_name="dup.png", user_id="system", created_at=datetime(2026, 1, 2))
    db_session.add(gen2)
    with pytest.raises(Exception):
        db_session.commit()
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_models.py -v
```
Expected: FAIL — `ModuleNotFoundError: No module named 'backend.app.models'`

- [ ] **Step 3: Implement ORM models**

```python
# backend/app/models.py
from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database import Base


class Generation(Base):
    __tablename__ = "generations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    image_name: Mapped[str] = mapped_column(String, unique=True, index=True)
    user_id: Mapped[Optional[str]] = mapped_column(String, index=True)
    created_at: Mapped[datetime]
    generation_mode: Mapped[Optional[str]] = mapped_column(String)
    model_name: Mapped[Optional[str]] = mapped_column(String, index=True)
    model_base: Mapped[Optional[str]] = mapped_column(String, index=True)
    model_key: Mapped[Optional[str]] = mapped_column(String)
    positive_prompt: Mapped[Optional[str]] = mapped_column(Text)
    negative_prompt: Mapped[Optional[str]] = mapped_column(Text)
    width: Mapped[Optional[int]]
    height: Mapped[Optional[int]]
    seed: Mapped[Optional[int]]
    steps: Mapped[Optional[int]]
    cfg_scale: Mapped[Optional[float]]
    scheduler: Mapped[Optional[str]] = mapped_column(String)
    starred: Mapped[Optional[bool]]
    has_workflow: Mapped[Optional[bool]]

    loras: Mapped[list["GenerationLora"]] = relationship(back_populates="generation", cascade="all, delete-orphan")


class GenerationLora(Base):
    __tablename__ = "generation_loras"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    generation_id: Mapped[int] = mapped_column(ForeignKey("generations.id"))
    lora_name: Mapped[str] = mapped_column(String)
    lora_weight: Mapped[float]

    generation: Mapped["Generation"] = relationship(back_populates="loras")


class QueueItem(Base):
    __tablename__ = "queue_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[str]] = mapped_column(String, index=True)
    batch_id: Mapped[Optional[str]] = mapped_column(String)
    session_id: Mapped[Optional[str]] = mapped_column(String, index=True)
    model_name: Mapped[Optional[str]] = mapped_column(String)
    model_base: Mapped[Optional[str]] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, index=True)
    created_at: Mapped[Optional[datetime]]
    started_at: Mapped[Optional[datetime]]
    completed_at: Mapped[Optional[datetime]]
    error_type: Mapped[Optional[str]] = mapped_column(String)
    error_message: Mapped[Optional[str]] = mapped_column(Text)


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[str] = mapped_column(String, primary_key=True)
    display_name: Mapped[Optional[str]] = mapped_column(String)
    image_count: Mapped[int] = mapped_column(default=0)


class SyncHistory(Base):
    __tablename__ = "sync_history"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    source_path: Mapped[str] = mapped_column(String)
    synced_at: Mapped[datetime]
    images_imported: Mapped[int]
    queue_items_imported: Mapped[int]


class AppSetting(Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String, primary_key=True)
    value: Mapped[Optional[str]] = mapped_column(String)
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_models.py -v
```
Expected: All 7 tests pass

- [ ] **Step 5: Commit**

```bash
git add backend/app/models.py tests/test_models.py
git commit -m "feat: add SQLAlchemy ORM models for all app tables"
```

---

## Chunk 2: Prompt Analyzer & Importer

### Task 5: Prompt Analyzer Service

**Files:**
- Create: `backend/services/prompt_analyzer.py`
- Create: `tests/test_prompt_analyzer.py`

- [ ] **Step 1: Write prompt analyzer tests**

```python
# tests/test_prompt_analyzer.py
from backend.services.prompt_analyzer import tokenize_prompt, analyze_tokens


def test_basic_comma_split():
    """Should split on commas and return cleaned tokens."""
    tokens = tokenize_prompt("a beautiful landscape, sunset, mountains")
    assert "beautiful landscape" in tokens
    assert "sunset" in tokens
    assert "mountains" in tokens


def test_removes_stopwords():
    """Should filter out common stopwords."""
    tokens = tokenize_prompt("a the of in with on")
    assert len(tokens) == 0


def test_removes_short_tokens():
    """Tokens of 1-2 chars should be filtered out."""
    tokens = tokenize_prompt("a, an, ok, cat, dog")
    assert "cat" in tokens
    assert "dog" in tokens
    assert "a" not in tokens
    assert "an" not in tokens
    assert "ok" not in tokens


def test_handles_weight_syntax():
    """Should extract word from (word:1.2) syntax."""
    tokens = tokenize_prompt("(masterpiece:1.4), (best quality:1.2), landscape")
    assert "masterpiece" in tokens
    assert "best quality" in tokens
    assert "landscape" in tokens


def test_handles_break_tokens():
    """Should ignore BREAK and other control tokens."""
    tokens = tokenize_prompt("landscape, BREAK, mountains, BREAK, sky")
    assert "BREAK" not in tokens
    assert "landscape" in tokens
    assert "mountains" in tokens


def test_deduplication():
    """Should deduplicate tokens within a single prompt."""
    tokens = tokenize_prompt("cat, cat, dog, cat")
    assert tokens.count("cat") == 1
    assert tokens.count("dog") == 1


def test_lowercases():
    """Should lowercase all tokens."""
    tokens = tokenize_prompt("Beautiful Landscape, SUNSET")
    assert "beautiful landscape" in tokens
    assert "sunset" in tokens


def test_empty_prompt():
    """Empty or None prompts should return empty list."""
    assert tokenize_prompt("") == []
    assert tokenize_prompt(None) == []


def test_analyze_tokens_counts():
    """analyze_tokens should count token frequency across prompts."""
    prompts = [
        "cat, dog, bird",
        "cat, fish",
        "cat, dog",
    ]
    result = analyze_tokens(prompts)
    # result is list of {"token": str, "count": int} sorted desc
    token_map = {r["token"]: r["count"] for r in result}
    assert token_map["cat"] == 3
    assert token_map["dog"] == 2
    assert token_map["fish"] == 1
    assert token_map["bird"] == 1


def test_analyze_tokens_limit():
    """analyze_tokens should respect limit parameter."""
    prompts = ["cat, dog, bird, fish, horse"]
    result = analyze_tokens(prompts, limit=3)
    assert len(result) == 3
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_prompt_analyzer.py -v
```
Expected: FAIL

- [ ] **Step 3: Implement prompt analyzer**

```python
# backend/services/prompt_analyzer.py
import re
from collections import Counter
from typing import Optional

STOPWORDS = {
    "a", "an", "the", "of", "in", "on", "at", "to", "for", "is", "it",
    "and", "or", "but", "with", "by", "from", "as", "be", "was", "were",
    "been", "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "shall", "can", "this",
    "that", "these", "those", "i", "you", "he", "she", "we", "they",
    "me", "him", "her", "us", "them", "my", "your", "his", "its", "our",
    "their", "not", "no", "so", "if", "up", "out", "just", "about",
    "into", "over", "after", "very",
}

CONTROL_TOKENS = {"BREAK", "break"}

# Matches (word:1.2) or (word phrase:0.8) — extracts the word/phrase part
WEIGHT_PATTERN = re.compile(r"\(([^:]+):\s*[\d.]+\)")


def tokenize_prompt(prompt: Optional[str]) -> list[str]:
    """Tokenize a prompt into cleaned, deduplicated tokens."""
    if not prompt:
        return []

    # Replace weight syntax with just the word
    prompt = WEIGHT_PATTERN.sub(r"\1", prompt)

    # Split on commas
    segments = prompt.split(",")

    seen = set()
    tokens = []
    for segment in segments:
        token = segment.strip().lower()

        # Skip empty, control tokens, stopwords, and short tokens
        if not token:
            continue
        if token.upper() in CONTROL_TOKENS:
            continue
        if token in STOPWORDS:
            continue
        if len(token) <= 2:
            continue

        # Dedup
        if token not in seen:
            seen.add(token)
            tokens.append(token)

    return tokens


def analyze_tokens(
    prompts: list[str], limit: int = 0
) -> list[dict[str, int]]:
    """Count token frequency across multiple prompts. Returns sorted desc."""
    counter: Counter = Counter()
    for prompt in prompts:
        tokens = tokenize_prompt(prompt)
        counter.update(tokens)

    items = counter.most_common(limit if limit > 0 else None)
    return [{"token": token, "count": count} for token, count in items]
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_prompt_analyzer.py -v
```
Expected: All 10 tests pass

- [ ] **Step 5: Commit**

```bash
git add backend/services/prompt_analyzer.py tests/test_prompt_analyzer.py
git commit -m "feat: add prompt tokenizer with weight syntax and stopword filtering"
```

---

### Task 6: Importer Service

**Files:**
- Create: `backend/services/importer.py`
- Create: `tests/test_importer.py`

The importer reads InvokeAI's `invokeai.db` (read-only), parses JSON metadata from the `images` table and `session_queue` table, and writes flattened records to the app's `reports.db`.

- [ ] **Step 1: Write importer tests**

```python
# tests/test_importer.py
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
    """Create a fake InvokeAI database with test data."""
    db_path = str(tmp_path / "invokeai.db")
    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE images (
            image_name TEXT PRIMARY KEY,
            image_origin TEXT NOT NULL DEFAULT 'internal',
            image_category TEXT NOT NULL DEFAULT 'general',
            width INTEGER NOT NULL DEFAULT 1024,
            height INTEGER NOT NULL DEFAULT 1024,
            session_id TEXT,
            node_id TEXT,
            metadata TEXT,
            is_intermediate BOOLEAN DEFAULT 0,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            deleted_at DATETIME,
            starred BOOLEAN DEFAULT 0,
            has_workflow BOOLEAN DEFAULT 0,
            user_id TEXT DEFAULT 'system'
        )
    """)
    conn.execute("""
        CREATE TABLE session_queue (
            item_id INTEGER PRIMARY KEY,
            batch_id TEXT NOT NULL,
            queue_id TEXT NOT NULL DEFAULT 'default',
            session_id TEXT NOT NULL,
            field_values TEXT,
            session TEXT NOT NULL,
            status TEXT NOT NULL,
            priority INTEGER NOT NULL DEFAULT 0,
            error_traceback TEXT,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            started_at DATETIME,
            completed_at DATETIME,
            workflow TEXT,
            error_type TEXT,
            error_message TEXT,
            origin TEXT,
            destination TEXT,
            retried_from_item_id INTEGER,
            user_id TEXT DEFAULT 'system'
        )
    """)
    conn.execute("""
        CREATE TABLE users (
            user_id TEXT PRIMARY KEY,
            email TEXT NOT NULL DEFAULT '',
            display_name TEXT,
            password_hash TEXT NOT NULL DEFAULT '',
            is_admin BOOLEAN NOT NULL DEFAULT 0,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            last_login_at DATETIME
        )
    """)

    # Insert test image with metadata
    metadata = json.dumps({
        "generation_mode": "sdxl_txt2img",
        "model": {"key": "abc-123", "name": "Juggernaut XL v9", "base": "sdxl", "type": "main"},
        "positive_prompt": "a beautiful sunset, mountains, golden hour",
        "negative_prompt": "ugly, blurry",
        "width": 1024,
        "height": 1024,
        "seed": 12345,
        "steps": 30,
        "cfg_scale": 7.5,
        "scheduler": "dpmpp_3m_k",
        "loras": [
            {"model": {"name": "JuggerCineXL2", "base": "sdxl"}, "weight": 0.75},
        ],
    })
    conn.execute(
        "INSERT INTO images (image_name, created_at, updated_at, metadata, starred, has_workflow, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        ("img-001.png", "2026-01-15 10:30:00", "2026-01-15 10:30:00", metadata, 0, 0, "system"),
    )

    # Insert image with no metadata
    conn.execute(
        "INSERT INTO images (image_name, created_at, updated_at, metadata, user_id) VALUES (?, ?, ?, ?, ?)",
        ("img-002.png", "2026-01-16 10:30:00", "2026-01-16 10:30:00", None, "system"),
    )

    # Insert image with empty metadata
    conn.execute(
        "INSERT INTO images (image_name, created_at, updated_at, metadata, user_id) VALUES (?, ?, ?, ?, ?)",
        ("img-003.png", "2026-01-17 10:30:00", "2026-01-17 10:30:00", "{}", "system"),
    )

    # Insert queue items
    session_json = json.dumps({
        "id": "session-001",
        "graph": {
            "nodes": {
                "model_loader": {
                    "type": "sdxl_model_loader",
                    "model": {"name": "Juggernaut XL v9", "base": "sdxl"},
                }
            }
        },
    })
    conn.execute(
        """INSERT INTO session_queue
        (batch_id, session_id, session, status, created_at, updated_at, started_at, completed_at, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        ("batch-001", "session-001", session_json, "completed",
         "2026-01-15 10:30:00", "2026-01-15 10:30:15",
         "2026-01-15 10:30:01", "2026-01-15 10:30:15", "system"),
    )
    conn.execute(
        """INSERT INTO session_queue
        (batch_id, session_id, session, status, created_at, updated_at, error_type, error_message, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        ("batch-002", "session-002", "{}", "failed",
         "2026-01-15 11:00:00", "2026-01-15 11:00:05",
         "ModelNotFound", "Model xyz not found", "system"),
    )

    # Insert user
    conn.execute(
        "INSERT INTO users (user_id, email, display_name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        ("system", "system@system.invokeai", "System User", "hash", "2026-01-01", "2026-01-01"),
    )

    conn.commit()
    conn.close()
    return db_path


@pytest.fixture
def app_db_path(tmp_path):
    """Return a path for the app database."""
    return str(tmp_path / "reports.db")


def test_parse_image_metadata():
    """Should extract fields from metadata JSON."""
    metadata = {
        "generation_mode": "sdxl_txt2img",
        "model": {"key": "abc", "name": "TestModel", "base": "sdxl"},
        "positive_prompt": "hello world",
        "negative_prompt": "ugly",
        "steps": 20,
        "cfg_scale": 7.0,
        "scheduler": "euler",
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
    """Empty or None metadata should return dict with None values."""
    result = parse_image_metadata({})
    assert result["model_name"] is None
    assert result["loras"] == []

    result = parse_image_metadata(None)
    assert result["model_name"] is None


def test_parse_session_model():
    """Should extract model info from session graph JSON."""
    session = {
        "graph": {
            "nodes": {
                "model_loader": {
                    "type": "sdxl_model_loader",
                    "model": {"name": "TestModel", "base": "sdxl"},
                }
            }
        }
    }
    name, base = parse_session_model(session)
    assert name == "TestModel"
    assert base == "sdxl"


def test_parse_session_model_no_model():
    """Missing model info should return None, None."""
    name, base = parse_session_model({})
    assert name is None
    assert base is None


def test_import_data_full(invoke_db, app_db_path):
    """Full import should create all records in app DB."""
    result = import_data(invoke_db, app_db_path)

    assert result["images_imported"] == 3
    assert result["queue_items_imported"] == 2

    engine = get_engine(app_db_path)
    with Session(engine) as session:
        # Check generations
        gens = session.query(Generation).all()
        assert len(gens) == 3

        # Check the one with full metadata
        gen = session.query(Generation).filter_by(image_name="img-001.png").first()
        assert gen.model_name == "Juggernaut XL v9"
        assert gen.model_base == "sdxl"
        assert gen.steps == 30
        assert gen.positive_prompt == "a beautiful sunset, mountains, golden hour"

        # Check LoRAs
        loras = session.query(GenerationLora).all()
        assert len(loras) == 1
        assert loras[0].lora_name == "JuggerCineXL2"
        assert loras[0].lora_weight == 0.75

        # Check queue items
        items = session.query(QueueItem).all()
        assert len(items) == 2
        completed = session.query(QueueItem).filter_by(status="completed").first()
        assert completed.model_name == "Juggernaut XL v9"
        failed = session.query(QueueItem).filter_by(status="failed").first()
        assert failed.error_type == "ModelNotFound"

        # Check users
        users = session.query(User).all()
        assert len(users) == 1
        assert users[0].display_name == "System User"
        assert users[0].image_count == 3

        # Check sync history
        syncs = session.query(SyncHistory).all()
        assert len(syncs) == 1
        assert syncs[0].images_imported == 3


def test_import_data_idempotent(invoke_db, app_db_path):
    """Running import twice should result in same data (full replace)."""
    import_data(invoke_db, app_db_path)
    import_data(invoke_db, app_db_path)

    engine = get_engine(app_db_path)
    with Session(engine) as session:
        assert session.query(Generation).count() == 3
        # Sync history should have 2 entries
        assert session.query(SyncHistory).count() == 2
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_importer.py -v
```
Expected: FAIL

- [ ] **Step 3: Implement importer**

```python
# backend/services/importer.py
import json
import sqlite3
from datetime import datetime
from typing import Any, Optional

from sqlalchemy.orm import Session

from backend.app.database import Base, get_engine
from backend.app.models import Generation, GenerationLora, QueueItem, User, SyncHistory


def parse_image_metadata(metadata: Optional[dict]) -> dict[str, Any]:
    """Extract flat fields from an InvokeAI image metadata dict."""
    if not metadata:
        return {
            "generation_mode": None,
            "model_name": None,
            "model_base": None,
            "model_key": None,
            "positive_prompt": None,
            "negative_prompt": None,
            "steps": None,
            "cfg_scale": None,
            "scheduler": None,
            "loras": [],
        }

    model = metadata.get("model") or {}
    loras_raw = metadata.get("loras") or []
    loras = []
    for lora in loras_raw:
        lora_model = lora.get("model") or {}
        loras.append({
            "name": lora_model.get("name"),
            "weight": lora.get("weight", 0.0),
        })

    return {
        "generation_mode": metadata.get("generation_mode"),
        "model_name": model.get("name"),
        "model_base": model.get("base"),
        "model_key": model.get("key"),
        "positive_prompt": metadata.get("positive_prompt"),
        "negative_prompt": metadata.get("negative_prompt"),
        "steps": metadata.get("steps"),
        "cfg_scale": metadata.get("cfg_scale"),
        "scheduler": metadata.get("scheduler"),
        "loras": loras,
    }


def parse_session_model(session_data: Optional[dict]) -> tuple[Optional[str], Optional[str]]:
    """Extract model name and base from a session queue's session JSON graph."""
    if not session_data:
        return None, None

    graph = session_data.get("graph") or {}
    nodes = graph.get("nodes") or {}

    # Look for model loader nodes — they contain model info
    for node_id, node in nodes.items():
        node_type = node.get("type", "")
        if "model_loader" in node_type:
            model = node.get("model") or {}
            name = model.get("name")
            base = model.get("base")
            if name:
                return name, base

    return None, None


def import_data(invoke_db_path: str, app_db_path: str) -> dict[str, int]:
    """Import data from InvokeAI's database into the app database.

    Strategy: full replace. Drops and recreates data tables, re-imports everything.
    sync_history table is preserved (append-only).
    """
    # Connect to source DB read-only
    source_conn = sqlite3.connect(f"file:{invoke_db_path}?mode=ro", uri=True)
    source_conn.row_factory = sqlite3.Row

    # Set up app DB
    engine = get_engine(app_db_path)
    Base.metadata.create_all(engine)

    images_imported = 0
    queue_items_imported = 0

    with Session(engine) as session:
        # Clear existing data (but not sync_history)
        session.query(GenerationLora).delete()
        session.query(Generation).delete()
        session.query(QueueItem).delete()
        session.query(User).delete()
        session.commit()

        # Import images
        cursor = source_conn.execute(
            "SELECT image_name, user_id, created_at, width, height, metadata, starred, has_workflow FROM images"
        )
        for row in cursor:
            metadata_str = row["metadata"]
            metadata = json.loads(metadata_str) if metadata_str else None
            parsed = parse_image_metadata(metadata)

            # Use metadata width/height if available, fall back to table columns
            width = (metadata.get("width") if metadata else None) or row["width"]
            height = (metadata.get("height") if metadata else None) or row["height"]

            gen = Generation(
                image_name=row["image_name"],
                user_id=row["user_id"],
                created_at=row["created_at"],
                generation_mode=parsed["generation_mode"],
                model_name=parsed["model_name"],
                model_base=parsed["model_base"],
                model_key=parsed["model_key"],
                positive_prompt=parsed["positive_prompt"],
                negative_prompt=parsed["negative_prompt"],
                width=width,
                height=height,
                seed=metadata.get("seed") if metadata else None,
                steps=parsed["steps"],
                cfg_scale=parsed["cfg_scale"],
                scheduler=parsed["scheduler"],
                starred=bool(row["starred"]) if row["starred"] is not None else None,
                has_workflow=bool(row["has_workflow"]) if row["has_workflow"] is not None else None,
            )
            session.add(gen)
            session.flush()  # Get the auto-generated id

            for lora in parsed["loras"]:
                session.add(GenerationLora(
                    generation_id=gen.id,
                    lora_name=lora["name"],
                    lora_weight=lora["weight"],
                ))

            images_imported += 1

        # Import queue items
        cursor = source_conn.execute(
            """SELECT batch_id, session_id, session, status, created_at,
                      started_at, completed_at, error_type, error_message, user_id
               FROM session_queue"""
        )
        for row in cursor:
            session_str = row["session"]
            session_data = json.loads(session_str) if session_str else None
            model_name, model_base = parse_session_model(session_data)

            session.add(QueueItem(
                user_id=row["user_id"],
                batch_id=row["batch_id"],
                session_id=row["session_id"],
                model_name=model_name,
                model_base=model_base,
                status=row["status"],
                created_at=row["created_at"],
                started_at=row["started_at"],
                completed_at=row["completed_at"],
                error_type=row["error_type"],
                error_message=row["error_message"],
            ))
            queue_items_imported += 1

        # Import users with image counts
        user_cursor = source_conn.execute("SELECT user_id, display_name FROM users")
        for row in user_cursor:
            user_id = row["user_id"]
            count = session.query(Generation).filter_by(user_id=user_id).count()
            session.add(User(
                user_id=user_id,
                display_name=row["display_name"],
                image_count=count,
            ))

        # Record sync
        session.add(SyncHistory(
            source_path=invoke_db_path,
            synced_at=datetime.now(),
            images_imported=images_imported,
            queue_items_imported=queue_items_imported,
        ))

        session.commit()

    source_conn.close()

    return {
        "images_imported": images_imported,
        "queue_items_imported": queue_items_imported,
    }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_importer.py -v
```
Expected: All 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add backend/services/importer.py tests/test_importer.py
git commit -m "feat: add importer to read InvokeAI DB and populate app DB"
```

---

## Chunk 3: Analytics Service

### Task 7: Analytics Service

**Files:**
- Create: `backend/services/analytics.py`
- Create: `tests/test_analytics.py`

This service contains the core query logic for all stats endpoints. Routers will call these functions and return results as JSON.

- [ ] **Step 1: Write analytics test fixtures**

Add to `tests/conftest.py`:

```python
from backend.app.models import Generation, GenerationLora, QueueItem, User, SyncHistory

@pytest.fixture
def seeded_db(db_session):
    """Database seeded with realistic test data for analytics."""
    # Add users
    db_session.add(User(user_id="user-1", display_name="Alice", image_count=5))
    db_session.add(User(user_id="user-2", display_name="Bob", image_count=3))

    # Add generations with varied models, dates, params
    test_generations = [
        # User 1 - SDXL images
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
        # User 2 - mixed
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

    # Add LoRAs to img-001
    gen1 = db_session.query(Generation).filter_by(image_name="img-001").first()
    db_session.add(GenerationLora(generation_id=gen1.id, lora_name="JuggerCineXL2", lora_weight=0.75))
    db_session.add(GenerationLora(generation_id=gen1.id, lora_name="DetailTweaker", lora_weight=0.5))

    # Add LoRA to img-006
    gen6 = db_session.query(Generation).filter_by(image_name="img-006").first()
    db_session.add(GenerationLora(generation_id=gen6.id, lora_name="JuggerCineXL2", lora_weight=0.6))

    # Add queue items
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
```

- [ ] **Step 2: Write analytics tests**

```python
# tests/test_analytics.py
from datetime import datetime, date
from backend.services.analytics import (
    get_overview_stats,
    get_top_models,
    get_least_used_models,
    get_family_distribution,
    get_model_leaderboard,
    get_resolution_distribution,
    get_scheduler_distribution,
    get_steps_distribution,
    get_cfg_distribution,
    get_lora_stats,
    get_error_stats,
    get_volume_trend,
    get_activity_heatmap,
    get_parameter_trends,
    get_prompt_top_tokens,
    get_prompt_length_distribution,
)


def test_overview_stats(seeded_db):
    result = get_overview_stats(seeded_db)
    assert result["total_images"] == 8
    assert result["models_used"] == 4  # Juggernaut, perfectdeliberate, flux1Dev, Z-Image
    assert result["top_model"] == "Juggernaut XL v9"  # 3 uses


def test_overview_stats_filtered_by_user(seeded_db):
    result = get_overview_stats(seeded_db, user_id="user-2")
    assert result["total_images"] == 3


def test_overview_stats_filtered_by_date(seeded_db):
    result = get_overview_stats(seeded_db, start_date=date(2026, 2, 1), end_date=date(2026, 2, 28))
    assert result["total_images"] == 4  # img-004, 005, 007, 008


def test_top_models(seeded_db):
    result = get_top_models(seeded_db, limit=3)
    assert len(result) == 3
    assert result[0]["model_name"] == "Juggernaut XL v9"
    assert result[0]["count"] == 3


def test_least_used_models(seeded_db):
    result = get_least_used_models(seeded_db, limit=2)
    assert len(result) == 2
    # perfectdeliberate_v70 and Z-Image Turbo each have 1 use
    names = [r["model_name"] for r in result]
    assert "perfectdeliberate_v70" in names
    assert "Z-Image Turbo" in names


def test_family_distribution(seeded_db):
    result = get_family_distribution(seeded_db)
    fam_map = {r["model_base"]: r["count"] for r in result}
    assert fam_map["sdxl"] == 4
    assert fam_map["flux"] == 3
    assert fam_map["z-image"] == 1


def test_model_leaderboard(seeded_db):
    result = get_model_leaderboard(seeded_db)
    assert len(result) == 4
    # Each entry should have: model_name, model_base, count, avg_steps, avg_cfg, common_resolution
    jugger = next(r for r in result if r["model_name"] == "Juggernaut XL v9")
    assert jugger["count"] == 3
    assert jugger["model_base"] == "sdxl"


def test_resolution_distribution(seeded_db):
    result = get_resolution_distribution(seeded_db)
    res_map = {r["resolution"]: r["count"] for r in result}
    assert res_map["1024x1024"] == 5


def test_scheduler_distribution(seeded_db):
    result = get_scheduler_distribution(seeded_db)
    sched_map = {r["scheduler"]: r["count"] for r in result}
    assert "euler" in sched_map
    assert "dpmpp_3m_k" in sched_map


def test_lora_stats(seeded_db):
    result = get_lora_stats(seeded_db)
    assert result["total_with_lora"] == 2  # img-001, img-006
    assert result["pct_with_lora"] == 25.0  # 2/8
    lora_map = {r["lora_name"]: r["count"] for r in result["top_loras"]}
    assert lora_map["JuggerCineXL2"] == 2
    assert lora_map["DetailTweaker"] == 1


def test_error_stats(seeded_db):
    result = get_error_stats(seeded_db)
    assert result["total_failed"] == 1
    assert result["total_items"] == 3
    assert len(result["by_error_type"]) == 1
    assert result["by_error_type"][0]["error_type"] == "ModelNotFound"


def test_volume_trend(seeded_db):
    result = get_volume_trend(seeded_db, granularity="month")
    assert len(result) >= 2  # Jan and Feb


def test_prompt_top_tokens(seeded_db):
    result = get_prompt_top_tokens(seeded_db, limit=5)
    token_map = {r["token"]: r["count"] for r in result}
    assert token_map["cat"] == 3  # img-001, img-004, img-006


def test_prompt_length_distribution(seeded_db):
    result = get_prompt_length_distribution(seeded_db)
    assert len(result) > 0
    # Each entry is {"bucket": "3-4 words", "count": N}
    assert all("bucket" in r and "count" in r for r in result)
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
pytest tests/test_analytics.py -v
```
Expected: FAIL

- [ ] **Step 4: Implement analytics service**

```python
# backend/services/analytics.py
from collections import Counter
from datetime import date
from typing import Optional

from sqlalchemy import func, case, distinct
from sqlalchemy.orm import Session

from backend.app.models import Generation, GenerationLora, QueueItem
from backend.services.prompt_analyzer import tokenize_prompt, analyze_tokens


def _next_day(d: date) -> str:
    """Return ISO string for the day after d, for < comparison."""
    from datetime import timedelta
    return str(d + timedelta(days=1))


def _apply_filters(query, user_id=None, start_date=None, end_date=None):
    """Apply common user_id and date range filters to a Generation query."""
    if user_id:
        query = query.filter(Generation.user_id == user_id)
    if start_date:
        query = query.filter(Generation.created_at >= str(start_date))
    if end_date:
        query = query.filter(Generation.created_at < _next_day(end_date))
    return query


def get_overview_stats(session: Session, user_id: str = None,
                       start_date: date = None, end_date: date = None) -> dict:
    base = session.query(Generation)
    base = _apply_filters(base, user_id, start_date, end_date)

    total = base.count()
    models_used = base.filter(Generation.model_name.isnot(None)).with_entities(
        func.count(distinct(Generation.model_name))
    ).scalar()

    # Top model
    top_model_row = (
        base.filter(Generation.model_name.isnot(None))
        .with_entities(Generation.model_name, func.count().label("cnt"))
        .group_by(Generation.model_name)
        .order_by(func.count().desc())
        .first()
    )
    top_model = top_model_row[0] if top_model_row else None

    # Date range
    first_date = base.with_entities(func.min(Generation.created_at)).scalar()
    last_date = base.with_entities(func.max(Generation.created_at)).scalar()

    return {
        "total_images": total,
        "models_used": models_used or 0,
        "top_model": top_model,
        "first_date": str(first_date) if first_date else None,
        "last_date": str(last_date) if last_date else None,
    }


def get_top_models(session: Session, limit: int = 10, user_id: str = None,
                   start_date: date = None, end_date: date = None) -> list[dict]:
    base = session.query(Generation)
    base = _apply_filters(base, user_id, start_date, end_date)

    rows = (
        base.filter(Generation.model_name.isnot(None))
        .with_entities(Generation.model_name, Generation.model_base, func.count().label("cnt"))
        .group_by(Generation.model_name, Generation.model_base)
        .order_by(func.count().desc())
        .limit(limit)
        .all()
    )
    return [{"model_name": r[0], "model_base": r[1], "count": r[2]} for r in rows]


def get_least_used_models(session: Session, limit: int = 10, user_id: str = None,
                          start_date: date = None, end_date: date = None) -> list[dict]:
    base = session.query(Generation)
    base = _apply_filters(base, user_id, start_date, end_date)

    rows = (
        base.filter(Generation.model_name.isnot(None))
        .with_entities(Generation.model_name, Generation.model_base, func.count().label("cnt"))
        .group_by(Generation.model_name, Generation.model_base)
        .order_by(func.count().asc())
        .limit(limit)
        .all()
    )
    return [{"model_name": r[0], "model_base": r[1], "count": r[2]} for r in rows]


def get_family_distribution(session: Session, user_id: str = None,
                            start_date: date = None, end_date: date = None) -> list[dict]:
    base = session.query(Generation)
    base = _apply_filters(base, user_id, start_date, end_date)

    rows = (
        base.filter(Generation.model_base.isnot(None))
        .with_entities(Generation.model_base, func.count().label("cnt"))
        .group_by(Generation.model_base)
        .order_by(func.count().desc())
        .all()
    )
    return [{"model_base": r[0], "count": r[1]} for r in rows]


def get_model_leaderboard(session: Session, user_id: str = None,
                          start_date: date = None, end_date: date = None) -> list[dict]:
    base = session.query(Generation)
    base = _apply_filters(base, user_id, start_date, end_date)

    rows = (
        base.filter(Generation.model_name.isnot(None))
        .with_entities(
            Generation.model_name,
            Generation.model_base,
            func.count().label("cnt"),
            func.avg(Generation.steps).label("avg_steps"),
            func.avg(Generation.cfg_scale).label("avg_cfg"),
            func.min(Generation.created_at).label("first_used"),
            func.max(Generation.created_at).label("last_used"),
        )
        .group_by(Generation.model_name, Generation.model_base)
        .order_by(func.count().desc())
        .all()
    )

    results = []
    for r in rows:
        # Get most common resolution for this model
        res_row = (
            base.filter(Generation.model_name == r[0])
            .filter(Generation.width.isnot(None), Generation.height.isnot(None))
            .with_entities(
                Generation.width, Generation.height, func.count().label("cnt")
            )
            .group_by(Generation.width, Generation.height)
            .order_by(func.count().desc())
            .first()
        )
        common_res = f"{res_row[0]}x{res_row[1]}" if res_row else None

        results.append({
            "model_name": r[0],
            "model_base": r[1],
            "count": r[2],
            "avg_steps": round(r[3], 1) if r[3] else None,
            "avg_cfg": round(r[4], 1) if r[4] else None,
            "common_resolution": common_res,
            "first_used": str(r[5]) if r[5] else None,
            "last_used": str(r[6]) if r[6] else None,
        })

    return results


def get_resolution_distribution(session: Session, user_id: str = None,
                                start_date: date = None, end_date: date = None) -> list[dict]:
    base = session.query(Generation)
    base = _apply_filters(base, user_id, start_date, end_date)

    rows = (
        base.filter(Generation.width.isnot(None), Generation.height.isnot(None))
        .with_entities(Generation.width, Generation.height, func.count().label("cnt"))
        .group_by(Generation.width, Generation.height)
        .order_by(func.count().desc())
        .all()
    )
    return [{"resolution": f"{r[0]}x{r[1]}", "width": r[0], "height": r[1], "count": r[2]} for r in rows]


def get_scheduler_distribution(session: Session, user_id: str = None,
                               start_date: date = None, end_date: date = None) -> list[dict]:
    base = session.query(Generation)
    base = _apply_filters(base, user_id, start_date, end_date)

    rows = (
        base.filter(Generation.scheduler.isnot(None))
        .with_entities(Generation.scheduler, func.count().label("cnt"))
        .group_by(Generation.scheduler)
        .order_by(func.count().desc())
        .all()
    )
    return [{"scheduler": r[0], "count": r[1]} for r in rows]


def get_steps_distribution(session: Session, user_id: str = None,
                           start_date: date = None, end_date: date = None) -> list[dict]:
    base = session.query(Generation)
    base = _apply_filters(base, user_id, start_date, end_date)

    rows = (
        base.filter(Generation.steps.isnot(None))
        .with_entities(Generation.steps, func.count().label("cnt"))
        .group_by(Generation.steps)
        .order_by(Generation.steps)
        .all()
    )
    return [{"steps": r[0], "count": r[1]} for r in rows]


def get_cfg_distribution(session: Session, user_id: str = None,
                         start_date: date = None, end_date: date = None) -> list[dict]:
    base = session.query(Generation)
    base = _apply_filters(base, user_id, start_date, end_date)

    rows = (
        base.filter(Generation.cfg_scale.isnot(None))
        .with_entities(Generation.cfg_scale, func.count().label("cnt"))
        .group_by(Generation.cfg_scale)
        .order_by(Generation.cfg_scale)
        .all()
    )
    return [{"cfg_scale": r[0], "count": r[1]} for r in rows]


def get_lora_stats(session: Session, user_id: str = None,
                   start_date: date = None, end_date: date = None) -> dict:
    base = session.query(Generation)
    base = _apply_filters(base, user_id, start_date, end_date)
    total = base.count()

    # Generations that have at least one LoRA
    gen_ids_with_lora = (
        session.query(GenerationLora.generation_id).distinct().subquery()
    )
    with_lora = base.filter(Generation.id.in_(
        session.query(gen_ids_with_lora)
    )).count()

    # Top LoRAs
    lora_query = session.query(
        GenerationLora.lora_name, func.count().label("cnt")
    ).group_by(GenerationLora.lora_name).order_by(func.count().desc())

    if user_id or start_date or end_date:
        filtered_ids = base.with_entities(Generation.id).subquery()
        lora_query = session.query(
            GenerationLora.lora_name, func.count().label("cnt")
        ).filter(GenerationLora.generation_id.in_(
            session.query(filtered_ids)
        )).group_by(GenerationLora.lora_name).order_by(func.count().desc())

    top_loras = [{"lora_name": r[0], "count": r[1]} for r in lora_query.all()]

    return {
        "total_with_lora": with_lora,
        "pct_with_lora": round((with_lora / total * 100), 1) if total > 0 else 0,
        "top_loras": top_loras,
    }


def get_error_stats(session: Session, user_id: str = None,
                    start_date: date = None, end_date: date = None) -> dict:
    base = session.query(QueueItem)
    if user_id:
        base = base.filter(QueueItem.user_id == user_id)
    if start_date:
        base = base.filter(QueueItem.created_at >= str(start_date))
    if end_date:
        base = base.filter(QueueItem.created_at < _next_day(end_date))

    total = base.count()
    failed = base.filter(QueueItem.status == "failed").count()

    by_error = (
        base.filter(QueueItem.error_type.isnot(None))
        .with_entities(QueueItem.error_type, func.count().label("cnt"))
        .group_by(QueueItem.error_type)
        .order_by(func.count().desc())
        .all()
    )

    by_model = (
        base.filter(QueueItem.status == "failed", QueueItem.model_name.isnot(None))
        .with_entities(QueueItem.model_name, func.count().label("cnt"))
        .group_by(QueueItem.model_name)
        .order_by(func.count().desc())
        .all()
    )

    return {
        "total_items": total,
        "total_failed": failed,
        "failure_rate": round((failed / total * 100), 1) if total > 0 else 0,
        "by_error_type": [{"error_type": r[0], "count": r[1]} for r in by_error],
        "by_model": [{"model_name": r[0], "count": r[1]} for r in by_model],
    }


def get_volume_trend(session: Session, granularity: str = "day",
                     user_id: str = None, start_date: date = None,
                     end_date: date = None) -> list[dict]:
    base = session.query(Generation)
    base = _apply_filters(base, user_id, start_date, end_date)

    if granularity == "month":
        date_expr = func.strftime("%Y-%m", Generation.created_at)
    elif granularity == "week":
        date_expr = func.strftime("%Y-%W", Generation.created_at)
    else:
        date_expr = func.strftime("%Y-%m-%d", Generation.created_at)

    rows = (
        base.with_entities(date_expr.label("period"), func.count().label("cnt"))
        .group_by(date_expr)
        .order_by(date_expr)
        .all()
    )
    return [{"period": r[0], "count": r[1]} for r in rows]


def get_activity_heatmap(session: Session, user_id: str = None,
                         start_date: date = None, end_date: date = None) -> list[dict]:
    base = session.query(Generation)
    base = _apply_filters(base, user_id, start_date, end_date)

    rows = (
        base.with_entities(
            func.strftime("%w", Generation.created_at).label("dow"),
            func.strftime("%H", Generation.created_at).label("hour"),
            func.count().label("cnt"),
        )
        .group_by("dow", "hour")
        .all()
    )
    return [{"day_of_week": int(r[0]), "hour": int(r[1]), "count": r[2]} for r in rows]


def get_parameter_trends(session: Session, granularity: str = "month",
                         user_id: str = None, start_date: date = None,
                         end_date: date = None) -> list[dict]:
    base = session.query(Generation)
    base = _apply_filters(base, user_id, start_date, end_date)

    if granularity == "month":
        date_expr = func.strftime("%Y-%m", Generation.created_at)
    elif granularity == "week":
        date_expr = func.strftime("%Y-%W", Generation.created_at)
    else:
        date_expr = func.strftime("%Y-%m-%d", Generation.created_at)

    rows = (
        base.with_entities(
            date_expr.label("period"),
            func.avg(Generation.steps).label("avg_steps"),
            func.avg(Generation.cfg_scale).label("avg_cfg"),
        )
        .group_by(date_expr)
        .order_by(date_expr)
        .all()
    )
    return [{
        "period": r[0],
        "avg_steps": round(r[1], 1) if r[1] else None,
        "avg_cfg": round(r[2], 1) if r[2] else None,
    } for r in rows]


def get_prompt_top_tokens(session: Session, limit: int = 20,
                          user_id: str = None, start_date: date = None,
                          end_date: date = None) -> list[dict]:
    base = session.query(Generation)
    base = _apply_filters(base, user_id, start_date, end_date)

    prompts = [
        r[0] for r in base.filter(Generation.positive_prompt.isnot(None))
        .with_entities(Generation.positive_prompt).all()
    ]
    return analyze_tokens(prompts, limit=limit)


def get_prompt_length_distribution(session: Session, user_id: str = None,
                                   start_date: date = None,
                                   end_date: date = None) -> list[dict]:
    base = session.query(Generation)
    base = _apply_filters(base, user_id, start_date, end_date)

    prompts = [
        r[0] for r in base.filter(Generation.positive_prompt.isnot(None))
        .with_entities(Generation.positive_prompt).all()
    ]

    lengths = [len(p.split()) for p in prompts if p.strip()]

    # Bucket into ranges
    buckets = {}
    for length in lengths:
        if length <= 5:
            key = "1-5 words"
        elif length <= 10:
            key = "6-10 words"
        elif length <= 20:
            key = "11-20 words"
        elif length <= 50:
            key = "21-50 words"
        else:
            key = "50+ words"
        buckets[key] = buckets.get(key, 0) + 1

    bucket_order = ["1-5 words", "6-10 words", "11-20 words", "21-50 words", "50+ words"]
    return [{"bucket": b, "count": buckets.get(b, 0)} for b in bucket_order if b in buckets]
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pytest tests/test_analytics.py -v
```
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add backend/services/analytics.py tests/test_analytics.py tests/conftest.py
git commit -m "feat: add analytics service with model, prompt, trend, and generation stats"
```

---

## Chunk 4: FastAPI App & Routers

### Task 8: FastAPI App Entry Point

**Files:**
- Create: `backend/app/main.py`

Note: This task creates the app factory. It cannot be tested in isolation because routers don't exist yet. It is tested indirectly by all router tests in Tasks 10-14 which use `create_app()`.

- [ ] **Step 1: Implement FastAPI app**

```python
# backend/app/main.py
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.config import get_settings
from backend.app.database import Base, get_engine
from backend.routers import sync, users, stats, settings, validate


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    s = get_settings()
    engine = get_engine(s.app_db_path)
    Base.metadata.create_all(engine)
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="InvokeAI Reports", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(sync.router, prefix="/api")
    app.include_router(users.router, prefix="/api")
    app.include_router(stats.router, prefix="/api")
    app.include_router(settings.router, prefix="/api")
    app.include_router(validate.router, prefix="/api")

    # Serve frontend static files in production
    frontend_dist = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
    if os.path.isdir(frontend_dist):
        app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")

    return app


app = create_app()


def run():
    """CLI entry point."""
    import uvicorn
    s = get_settings()
    uvicorn.run("backend.app.main:app", host=s.host, port=s.port, reload=False)
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/main.py
git commit -m "feat: add FastAPI app with CORS, lifespan, and static file serving"
```

---

### Task 9: Database Dependency for Routers

**Files:**
- Modify: `backend/app/database.py` (add FastAPI dependency)

- [ ] **Step 1: Add get_db dependency to database.py**

Append to `backend/app/database.py`:

```python
from backend.app.config import get_settings

# Module-level state for app DB path — can be overridden for testing
_app_db_path: str | None = None


def set_app_db_path(path: str):
    """Override the app DB path (used by tests and app startup)."""
    global _app_db_path
    _app_db_path = path


def get_app_db_path() -> str:
    """Return the current app DB path."""
    if _app_db_path:
        return _app_db_path
    return get_settings().app_db_path


def get_db():
    """FastAPI dependency that yields a database session."""
    engine = get_engine(get_app_db_path())
    with Session(engine) as session:
        yield session
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/database.py
git commit -m "feat: add FastAPI database session dependency"
```

---

### Task 10: Sync Router

**Files:**
- Create: `backend/routers/sync.py`
- Create: `tests/test_sync_router.py`

- [ ] **Step 1: Write sync router tests**

```python
# tests/test_sync_router.py
import json
import sqlite3
import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import create_app
from backend.app.database import Base, get_engine, get_db, set_app_db_path
from backend.app.models import SyncHistory


@pytest.fixture
def invoke_db_path(tmp_path):
    """Create a minimal fake InvokeAI database."""
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
    metadata = json.dumps({"generation_mode": "sdxl_txt2img", "model": {"name": "TestModel", "base": "sdxl", "key": "k1"},
                           "positive_prompt": "test", "steps": 20, "cfg_scale": 7.0, "scheduler": "euler"})
    conn.execute("INSERT INTO images VALUES ('img1','internal','general',1024,1024,NULL,NULL,?,0,?,?,NULL,0,0,'system')",
                 (metadata, "2026-01-01", "2026-01-01"))
    conn.execute("INSERT INTO session_queue (batch_id,session_id,session,status,created_at,updated_at,user_id) VALUES (?,?,?,?,?,?,?)",
                 ("b1", "s1", "{}", "completed", "2026-01-01", "2026-01-01", "system"))
    conn.execute("INSERT INTO users (user_id,email,display_name,password_hash,created_at,updated_at) VALUES (?,?,?,?,?,?)",
                 ("system", "sys@sys", "System", "h", "2026-01-01", "2026-01-01"))
    conn.commit()
    conn.close()
    return db_path


@pytest.fixture
def client(tmp_path, invoke_db_path):
    """FastAPI test client with isolated app DB."""
    app_db = str(tmp_path / "test_reports.db")
    app = create_app()
    engine = get_engine(app_db)
    Base.metadata.create_all(engine)

    def override_db():
        with Session(engine) as s:
            yield s

    app.dependency_overrides[get_db] = override_db
    # Ensure importer also writes to the test DB
    set_app_db_path(app_db)
    return TestClient(app), invoke_db_path, app_db


def test_sync_triggers_import(client):
    tc, invoke_path, app_db = client
    resp = tc.post("/api/sync", json={"invoke_path": invoke_path})
    assert resp.status_code == 200
    data = resp.json()
    assert data["images_imported"] == 1
    assert data["queue_items_imported"] == 1


def test_sync_status_after_import(client):
    tc, invoke_path, app_db = client
    tc.post("/api/sync", json={"invoke_path": invoke_path})
    resp = tc.get("/api/sync/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["last_sync"] is not None
    assert data["images_imported"] == 1


def test_sync_status_before_import(client):
    tc, _, _ = client
    resp = tc.get("/api/sync/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["last_sync"] is None
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_sync_router.py -v
```
Expected: FAIL

- [ ] **Step 3: Implement sync router**

```python
# backend/routers/sync.py
import threading
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.database import get_db, get_app_db_path
from backend.app.models import SyncHistory
from backend.services.importer import import_data

router = APIRouter(tags=["sync"])

_sync_lock = threading.Lock()


class SyncRequest(BaseModel):
    invoke_path: str


@router.post("/sync")
def trigger_sync(req: SyncRequest, db: Session = Depends(get_db)):
    if not _sync_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="Sync already in progress")
    try:
        app_db_path = get_app_db_path()
        result = import_data(req.invoke_path, app_db_path)
        return result
    finally:
        _sync_lock.release()


@router.get("/sync/status")
def sync_status(db: Session = Depends(get_db)):
    last = db.query(SyncHistory).order_by(SyncHistory.synced_at.desc()).first()
    if not last:
        return {"last_sync": None, "source_path": None, "images_imported": None, "queue_items_imported": None}
    return {
        "last_sync": str(last.synced_at),
        "source_path": last.source_path,
        "images_imported": last.images_imported,
        "queue_items_imported": last.queue_items_imported,
    }
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_sync_router.py -v
```
Expected: All 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add backend/routers/sync.py tests/test_sync_router.py
git commit -m "feat: add sync router with import trigger and status endpoint"
```

---

### Task 11: Validate Router

**Files:**
- Create: `backend/routers/validate.py`
- Create: `tests/test_validate_router.py`

- [ ] **Step 1: Write validate router tests**

```python
# tests/test_validate_router.py
import sqlite3
import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import create_app
from backend.app.database import Base, get_engine, get_db


@pytest.fixture
def valid_invoke_path(tmp_path):
    """Create a path with databases/invokeai.db."""
    db_dir = tmp_path / "databases"
    db_dir.mkdir()
    db_path = str(db_dir / "invokeai.db")
    conn = sqlite3.connect(db_path)
    conn.execute("""CREATE TABLE images (
        image_name TEXT PRIMARY KEY, metadata TEXT, user_id TEXT, created_at DATETIME NOT NULL DEFAULT '')""")
    metadata = json.dumps({"model": {"name": "Model1"}, "generation_mode": "sdxl_txt2img"})
    conn.execute("INSERT INTO images VALUES ('img1', ?, 'system', '2026-01-01')", (metadata,))
    conn.execute("INSERT INTO images VALUES ('img2', ?, 'system', '2026-01-01')", (metadata,))
    conn.commit()
    conn.close()
    return str(tmp_path)


@pytest.fixture
def client(tmp_path):
    app = create_app()
    app_db = str(tmp_path / "test.db")
    engine = get_engine(app_db)
    Base.metadata.create_all(engine)
    def override_db():
        with Session(engine) as s:
            yield s
    app.dependency_overrides[get_db] = override_db
    return TestClient(app)


def test_validate_valid_path(client, valid_invoke_path):
    resp = client.post("/api/validate-path", json={"path": valid_invoke_path})
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["image_count"] == 2
    assert data["model_count"] >= 1


def test_validate_invalid_path(client, tmp_path):
    resp = client.post("/api/validate-path", json={"path": str(tmp_path / "nonexistent")})
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is False


def test_validate_path_no_db(client, tmp_path):
    # Path exists but no databases/invokeai.db
    resp = client.post("/api/validate-path", json={"path": str(tmp_path)})
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is False
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_validate_router.py -v
```

- [ ] **Step 3: Implement validate router**

```python
# backend/routers/validate.py
import json
import os
import sqlite3
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["validate"])


class ValidateRequest(BaseModel):
    path: str


@router.post("/validate-path")
def validate_path(req: ValidateRequest):
    db_path = os.path.join(req.path, "databases", "invokeai.db")
    if not os.path.isfile(db_path):
        return {"valid": False, "error": "Database not found at expected location"}

    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        cursor = conn.execute("SELECT COUNT(*) FROM images")
        image_count = cursor.fetchone()[0]

        cursor = conn.execute("SELECT COUNT(DISTINCT user_id) FROM images")
        user_count = cursor.fetchone()[0]

        # Count distinct models from metadata JSON
        cursor = conn.execute("SELECT metadata FROM images WHERE metadata IS NOT NULL LIMIT 1000")
        models = set()
        for row in cursor:
            try:
                meta = json.loads(row[0])
                model = meta.get("model", {})
                if model and model.get("name"):
                    models.add(model["name"])
            except (json.JSONDecodeError, TypeError):
                pass

        conn.close()
        return {
            "valid": True,
            "image_count": image_count,
            "user_count": user_count,
            "model_count": len(models),
        }
    except Exception as e:
        return {"valid": False, "error": str(e)}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_validate_router.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/routers/validate.py tests/test_validate_router.py
git commit -m "feat: add validate-path endpoint for InvokeAI DB detection"
```

---

### Task 12: Users Router

**Files:**
- Create: `backend/routers/users.py`
- Create: `tests/test_users_router.py`

- [ ] **Step 1: Write tests**

```python
# tests/test_users_router.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import create_app
from backend.app.database import Base, get_engine, get_db
from backend.app.models import User


@pytest.fixture
def client(tmp_path):
    app = create_app()
    app_db = str(tmp_path / "test.db")
    engine = get_engine(app_db)
    Base.metadata.create_all(engine)

    def override_db():
        with Session(engine) as s:
            yield s

    app.dependency_overrides[get_db] = override_db

    # Seed users
    with Session(engine) as s:
        s.add(User(user_id="user-1", display_name="Alice", image_count=100))
        s.add(User(user_id="user-2", display_name="Bob", image_count=50))
        s.commit()

    return TestClient(app)


def test_list_users(client):
    resp = client.get("/api/users")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["display_name"] == "Alice"
    assert data[0]["image_count"] == 100


def test_users_sorted_by_count(client):
    resp = client.get("/api/users")
    data = resp.json()
    assert data[0]["image_count"] >= data[1]["image_count"]
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement users router**

```python
# backend/routers/users.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import User

router = APIRouter(tags=["users"])


@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.image_count.desc()).all()
    return [
        {"user_id": u.user_id, "display_name": u.display_name, "image_count": u.image_count}
        for u in users
    ]
```

- [ ] **Step 4: Run tests, verify pass**

- [ ] **Step 5: Commit**

```bash
git add backend/routers/users.py tests/test_users_router.py
git commit -m "feat: add users endpoint"
```

---

### Task 13: Stats Router

**Files:**
- Create: `backend/routers/stats.py`
- Create: `tests/test_stats_router.py`

- [ ] **Step 1: Write stats router tests**

```python
# tests/test_stats_router.py
import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import create_app
from backend.app.database import Base, get_engine, get_db
from backend.app.models import Generation, GenerationLora, QueueItem, User


@pytest.fixture
def client(tmp_path):
    app = create_app()
    app_db = str(tmp_path / "test.db")
    engine = get_engine(app_db)
    Base.metadata.create_all(engine)

    def override_db():
        with Session(engine) as s:
            yield s

    app.dependency_overrides[get_db] = override_db

    # Seed test data
    with Session(engine) as s:
        s.add(User(user_id="system", display_name="System", image_count=3))
        g1 = Generation(image_name="i1", user_id="system", created_at=datetime(2026, 1, 10),
                        generation_mode="sdxl_txt2img", model_name="ModelA", model_base="sdxl",
                        positive_prompt="cat, cute, fluffy", negative_prompt="ugly",
                        width=1024, height=1024, steps=30, cfg_scale=7.5, scheduler="euler")
        g2 = Generation(image_name="i2", user_id="system", created_at=datetime(2026, 1, 15),
                        generation_mode="flux_txt2img", model_name="ModelB", model_base="flux",
                        positive_prompt="dog, running", negative_prompt="",
                        width=1024, height=768, steps=20, cfg_scale=1.0, scheduler="euler")
        g3 = Generation(image_name="i3", user_id="system", created_at=datetime(2026, 2, 1),
                        generation_mode="sdxl_txt2img", model_name="ModelA", model_base="sdxl",
                        positive_prompt="cat, sunset", negative_prompt="",
                        width=1024, height=1024, steps=25, cfg_scale=7.0, scheduler="dpmpp_3m_k")
        s.add_all([g1, g2, g3])
        s.flush()
        s.add(GenerationLora(generation_id=g1.id, lora_name="LoRA1", lora_weight=0.5))
        s.add(QueueItem(user_id="system", batch_id="b1", session_id="s1",
                        model_name="ModelA", model_base="sdxl", status="completed",
                        created_at=datetime(2026, 1, 10)))
        s.add(QueueItem(user_id="system", batch_id="b2", session_id="s2",
                        model_name="ModelB", model_base="flux", status="failed",
                        created_at=datetime(2026, 1, 15),
                        error_type="OOM", error_message="Out of memory"))
        s.commit()

    return TestClient(app)


def test_overview(client):
    resp = client.get("/api/stats/overview")
    assert resp.status_code == 200
    d = resp.json()
    assert d["total_images"] == 3
    assert d["models_used"] == 2
    assert d["top_model"] == "ModelA"


def test_overview_with_user_filter(client):
    resp = client.get("/api/stats/overview?user_id=system")
    assert resp.status_code == 200
    assert resp.json()["total_images"] == 3


def test_overview_with_date_filter(client):
    resp = client.get("/api/stats/overview?start_date=2026-02-01&end_date=2026-02-28")
    assert resp.status_code == 200
    assert resp.json()["total_images"] == 1


def test_top_models(client):
    resp = client.get("/api/stats/models/top?limit=5")
    assert resp.status_code == 200
    d = resp.json()
    assert d[0]["model_name"] == "ModelA"
    assert d[0]["count"] == 2


def test_family_distribution(client):
    resp = client.get("/api/stats/models/family-distribution")
    assert resp.status_code == 200
    d = resp.json()
    fam = {r["model_base"]: r["count"] for r in d}
    assert fam["sdxl"] == 2
    assert fam["flux"] == 1


def test_model_leaderboard(client):
    resp = client.get("/api/stats/models/leaderboard")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_prompt_top_tokens(client):
    resp = client.get("/api/stats/prompts/top-tokens?limit=5")
    assert resp.status_code == 200
    d = resp.json()
    tokens = {r["token"]: r["count"] for r in d}
    assert tokens["cat"] == 2


def test_prompt_length(client):
    resp = client.get("/api/stats/prompts/length-distribution")
    assert resp.status_code == 200


def test_volume_trend(client):
    resp = client.get("/api/stats/trends/volume?granularity=month")
    assert resp.status_code == 200
    assert len(resp.json()) >= 2


def test_resolutions(client):
    resp = client.get("/api/stats/generation/resolutions")
    assert resp.status_code == 200


def test_schedulers(client):
    resp = client.get("/api/stats/generation/schedulers")
    assert resp.status_code == 200


def test_loras(client):
    resp = client.get("/api/stats/generation/loras")
    assert resp.status_code == 200
    d = resp.json()
    assert d["total_with_lora"] == 1


def test_errors(client):
    resp = client.get("/api/stats/generation/errors")
    assert resp.status_code == 200
    d = resp.json()
    assert d["total_failed"] == 1
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement stats router**

```python
# backend/routers/stats.py
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.services import analytics

router = APIRouter(tags=["stats"])


def _parse_date(d: Optional[str]) -> Optional[date]:
    if d:
        return date.fromisoformat(d)
    return None


# --- Overview ---

@router.get("/stats/overview")
def overview(user_id: Optional[str] = None,
             start_date: Optional[str] = None,
             end_date: Optional[str] = None,
             db: Session = Depends(get_db)):
    return analytics.get_overview_stats(
        db, user_id=user_id,
        start_date=_parse_date(start_date),
        end_date=_parse_date(end_date),
    )


# --- Models ---

@router.get("/stats/models/top")
def top_models(limit: int = 10,
               user_id: Optional[str] = None,
               start_date: Optional[str] = None,
               end_date: Optional[str] = None,
               db: Session = Depends(get_db)):
    return analytics.get_top_models(
        db, limit=limit, user_id=user_id,
        start_date=_parse_date(start_date),
        end_date=_parse_date(end_date),
    )


@router.get("/stats/models/least")
def least_models(limit: int = 10,
                 user_id: Optional[str] = None,
                 start_date: Optional[str] = None,
                 end_date: Optional[str] = None,
                 db: Session = Depends(get_db)):
    return analytics.get_least_used_models(
        db, limit=limit, user_id=user_id,
        start_date=_parse_date(start_date),
        end_date=_parse_date(end_date),
    )


@router.get("/stats/models/family-distribution")
def family_dist(user_id: Optional[str] = None,
                start_date: Optional[str] = None,
                end_date: Optional[str] = None,
                db: Session = Depends(get_db)):
    return analytics.get_family_distribution(
        db, user_id=user_id,
        start_date=_parse_date(start_date),
        end_date=_parse_date(end_date),
    )


@router.get("/stats/models/leaderboard")
def leaderboard(user_id: Optional[str] = None,
                start_date: Optional[str] = None,
                end_date: Optional[str] = None,
                db: Session = Depends(get_db)):
    return analytics.get_model_leaderboard(
        db, user_id=user_id,
        start_date=_parse_date(start_date),
        end_date=_parse_date(end_date),
    )


# --- Prompts ---

@router.get("/stats/prompts/top-tokens")
def prompt_tokens(limit: int = 20,
                  user_id: Optional[str] = None,
                  start_date: Optional[str] = None,
                  end_date: Optional[str] = None,
                  db: Session = Depends(get_db)):
    return analytics.get_prompt_top_tokens(
        db, limit=limit, user_id=user_id,
        start_date=_parse_date(start_date),
        end_date=_parse_date(end_date),
    )


@router.get("/stats/prompts/length-distribution")
def prompt_length(user_id: Optional[str] = None,
                  start_date: Optional[str] = None,
                  end_date: Optional[str] = None,
                  db: Session = Depends(get_db)):
    return analytics.get_prompt_length_distribution(
        db, user_id=user_id,
        start_date=_parse_date(start_date),
        end_date=_parse_date(end_date),
    )


# --- Trends ---

@router.get("/stats/trends/volume")
def volume_trend(granularity: str = "day",
                 user_id: Optional[str] = None,
                 start_date: Optional[str] = None,
                 end_date: Optional[str] = None,
                 db: Session = Depends(get_db)):
    return analytics.get_volume_trend(
        db, granularity=granularity, user_id=user_id,
        start_date=_parse_date(start_date),
        end_date=_parse_date(end_date),
    )


@router.get("/stats/trends/heatmap")
def heatmap(user_id: Optional[str] = None,
            start_date: Optional[str] = None,
            end_date: Optional[str] = None,
            db: Session = Depends(get_db)):
    return analytics.get_activity_heatmap(
        db, user_id=user_id,
        start_date=_parse_date(start_date),
        end_date=_parse_date(end_date),
    )


@router.get("/stats/trends/parameters")
def param_trends(granularity: str = "month",
                 user_id: Optional[str] = None,
                 start_date: Optional[str] = None,
                 end_date: Optional[str] = None,
                 db: Session = Depends(get_db)):
    return analytics.get_parameter_trends(
        db, granularity=granularity, user_id=user_id,
        start_date=_parse_date(start_date),
        end_date=_parse_date(end_date),
    )


# --- Generation ---

@router.get("/stats/generation/resolutions")
def resolutions(user_id: Optional[str] = None,
                start_date: Optional[str] = None,
                end_date: Optional[str] = None,
                db: Session = Depends(get_db)):
    return analytics.get_resolution_distribution(
        db, user_id=user_id,
        start_date=_parse_date(start_date),
        end_date=_parse_date(end_date),
    )


@router.get("/stats/generation/schedulers")
def schedulers(user_id: Optional[str] = None,
               start_date: Optional[str] = None,
               end_date: Optional[str] = None,
               db: Session = Depends(get_db)):
    return analytics.get_scheduler_distribution(
        db, user_id=user_id,
        start_date=_parse_date(start_date),
        end_date=_parse_date(end_date),
    )


@router.get("/stats/generation/steps")
def steps_dist(user_id: Optional[str] = None,
               start_date: Optional[str] = None,
               end_date: Optional[str] = None,
               db: Session = Depends(get_db)):
    return analytics.get_steps_distribution(
        db, user_id=user_id,
        start_date=_parse_date(start_date),
        end_date=_parse_date(end_date),
    )


@router.get("/stats/generation/cfg")
def cfg_dist(user_id: Optional[str] = None,
             start_date: Optional[str] = None,
             end_date: Optional[str] = None,
             db: Session = Depends(get_db)):
    return analytics.get_cfg_distribution(
        db, user_id=user_id,
        start_date=_parse_date(start_date),
        end_date=_parse_date(end_date),
    )


@router.get("/stats/generation/loras")
def loras(user_id: Optional[str] = None,
          start_date: Optional[str] = None,
          end_date: Optional[str] = None,
          db: Session = Depends(get_db)):
    return analytics.get_lora_stats(
        db, user_id=user_id,
        start_date=_parse_date(start_date),
        end_date=_parse_date(end_date),
    )


@router.get("/stats/generation/errors")
def errors(user_id: Optional[str] = None,
           start_date: Optional[str] = None,
           end_date: Optional[str] = None,
           db: Session = Depends(get_db)):
    return analytics.get_error_stats(
        db, user_id=user_id,
        start_date=_parse_date(start_date),
        end_date=_parse_date(end_date),
    )
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_stats_router.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/routers/stats.py tests/test_stats_router.py
git commit -m "feat: add all stats API endpoints (models, prompts, trends, generation)"
```

---

### Task 14: Settings Router

**Files:**
- Create: `backend/routers/settings.py`
- Create: `tests/test_settings_router.py`

- [ ] **Step 1: Write settings router tests**

```python
# tests/test_settings_router.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import create_app
from backend.app.database import Base, get_engine, get_db
from backend.app.models import SyncHistory, Generation
from datetime import datetime


@pytest.fixture
def client(tmp_path):
    app = create_app()
    app_db = str(tmp_path / "test.db")
    engine = get_engine(app_db)
    Base.metadata.create_all(engine)

    def override_db():
        with Session(engine) as s:
            yield s

    app.dependency_overrides[get_db] = override_db

    # Seed some data
    with Session(engine) as s:
        s.add(Generation(image_name="i1", user_id="system", created_at=datetime(2026, 1, 1)))
        s.add(SyncHistory(source_path="/test", synced_at=datetime(2026, 1, 1),
                          images_imported=1, queue_items_imported=0))
        s.commit()

    app.state.test_app_db = app_db
    return TestClient(app), app_db


def test_get_settings(client):
    tc, _ = client
    resp = tc.get("/api/settings")
    assert resp.status_code == 200
    d = resp.json()
    assert "invoke_path" in d
    assert "last_sync" in d


def test_update_settings(client):
    tc, _ = client
    resp = tc.put("/api/settings", json={"invoke_path": "/new/path"})
    assert resp.status_code == 200
    assert resp.json()["invoke_path"] == "/new/path"


def test_clear_data(client):
    tc, app_db = client
    resp = tc.post("/api/settings/clear")
    assert resp.status_code == 200

    # Verify data is cleared
    engine = get_engine(app_db)
    with Session(engine) as s:
        assert s.query(Generation).count() == 0
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_settings_router.py -v
```
Expected: FAIL

- [ ] **Step 3: Implement settings router**

```python
# backend/routers/settings.py
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models import SyncHistory, Generation, GenerationLora, QueueItem, User, AppSetting

router = APIRouter(tags=["settings"])


def _get_setting(db: Session, key: str) -> Optional[str]:
    row = db.query(AppSetting).filter_by(key=key).first()
    return row.value if row else None


def _set_setting(db: Session, key: str, value: str):
    row = db.query(AppSetting).filter_by(key=key).first()
    if row:
        row.value = value
    else:
        db.add(AppSetting(key=key, value=value))
    db.commit()


class SettingsUpdate(BaseModel):
    invoke_path: Optional[str] = None


@router.get("/settings")
def get_current_settings(db: Session = Depends(get_db)):
    last_sync = db.query(SyncHistory).order_by(SyncHistory.synced_at.desc()).first()

    return {
        "invoke_path": _get_setting(db, "invoke_path"),
        "last_sync": str(last_sync.synced_at) if last_sync else None,
    }


@router.put("/settings")
def update_settings(update: SettingsUpdate, db: Session = Depends(get_db)):
    if update.invoke_path is not None:
        _set_setting(db, "invoke_path", update.invoke_path)
    return {"invoke_path": _get_setting(db, "invoke_path")}


@router.post("/settings/clear")
def clear_data(db: Session = Depends(get_db)):
    """Drop all app data and return to first-run state."""
    db.query(GenerationLora).delete()
    db.query(Generation).delete()
    db.query(QueueItem).delete()
    db.query(User).delete()
    db.query(SyncHistory).delete()
    db.query(AppSetting).delete()
    db.commit()
    return {"status": "cleared"}
```

- [ ] **Step 5: Run all tests**

```bash
pytest tests/test_settings_router.py -v
```

- [ ] **Step 6: Commit**

```bash
git add backend/routers/settings.py tests/test_settings_router.py
git commit -m "feat: add settings endpoints with get, update, and clear"
```

---

### Task 15: Run Full Test Suite & Final Commit

- [ ] **Step 1: Run complete test suite**

```bash
pytest -v
```
Expected: All tests pass

- [ ] **Step 2: Commit any remaining files**

```bash
git add -A
git status
```

If there are unstaged files, review and commit:

```bash
git commit -m "chore: complete backend foundation with all tests passing"
```

---

## Endpoints Not Yet Covered

The following spec endpoints are deferred to the frontend plan or a follow-up backend plan because they require additional analytics functions:

| Endpoint | Notes |
|----------|-------|
| `GET /api/stats/models/by-family` | Top model per family — add to analytics.py |
| `GET /api/stats/models/family-trends` | Time-series per family — add to analytics.py |
| `GET /api/stats/models/lora-pairings` | Model+LoRA co-occurrence — add to analytics.py |
| `GET /api/stats/prompts/token-pairs` | Token co-occurrence — add to prompt_analyzer.py |
| `GET /api/stats/prompts/negative` | Negative prompt analysis — add to analytics.py |
| `GET /api/stats/trends/model-adoption` | First/last use timeline — add to analytics.py |

These will be added as needed when building the corresponding frontend pages.
