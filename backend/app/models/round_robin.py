"""Model: Controle round-robin de técnicos internos por unidade."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class RoundRobinTecnico(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "round_robin_tecnico"

    unidade_medsest_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("unidades_medsest.id"),
        unique=True,
        nullable=False,
    )
    ultimo_tecnico_interno_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("usuarios.id")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
