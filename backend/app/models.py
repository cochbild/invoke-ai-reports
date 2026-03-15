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
