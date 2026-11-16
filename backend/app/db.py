from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import ForeignKey, String, create_engine, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from .config import DATABASE_URL

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
Session = sessionmaker(engine, expire_on_commit=False)


def _id() -> str:
    return str(uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    email: Mapped[str] = mapped_column(String(320), unique=True)
    password_hash: Mapped[str]
    full_name: Mapped[str]
    company: Mapped[str | None]
    # момент согласия на обработку персональных данных (152-ФЗ)
    pd_consent_at: Mapped[datetime] = mapped_column(default=_now)
    created_at: Mapped[datetime] = mapped_column(default=_now)


class Check(Base):
    __tablename__ = "checks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_id)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    cadastral_number: Mapped[str]
    purpose: Mapped[str]
    status: Mapped[str] = mapped_column(default="queued")
    stage_message: Mapped[str | None] = mapped_column(default="Проверка в очереди")
    error: Mapped[str | None]
    address: Mapped[str | None]
    overall_level: Mapped[str | None]
    report: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(default=_now)


def init_db() -> None:
    # shortcut: create_all вместо миграций Alembic — он не меняет существующие таблицы; завести Alembic при первом изменении схемы
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
    Base.metadata.create_all(engine)


def get_session():
    with Session() as session:
        yield session
