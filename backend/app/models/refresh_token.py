"""Model: Refresh tokens de autenticação."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import CreatedAtMixin, UUIDPrimaryKeyMixin


class RefreshToken(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "refresh_tokens"

    usuario_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="CASCADE"),
    )
    token: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
