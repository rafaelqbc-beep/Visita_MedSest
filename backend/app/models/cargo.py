"""Model: Cargos/Funções por setor."""
import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Cargo(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "cargos"

    setor_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("setores.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nome_cargo: Mapped[str] = mapped_column(String(200), nullable=False)
    descricao_funcao: Mapped[str | None] = mapped_column(Text)
    ordem: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    setor: Mapped["Setor"] = relationship(back_populates="cargos")  # noqa: F821
