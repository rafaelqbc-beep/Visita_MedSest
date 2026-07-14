"""Model: Usuários (todos os perfis)."""
import uuid

from sqlalchemy import Boolean, Enum as SAEnum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import RoleEnum
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Usuario(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "usuarios"

    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    telefone: Mapped[str | None] = mapped_column(String(20))
    whatsapp: Mapped[str | None] = mapped_column(String(20))
    role: Mapped[RoleEnum] = mapped_column(
        SAEnum(RoleEnum, name="role_enum", values_callable=lambda e: [x.value for x in e]),
        nullable=False,
    )
    unidade_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("unidades_medsest.id")
    )
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    unidade: Mapped["UnidadeMedsest | None"] = relationship(back_populates="usuarios")  # noqa: F821
