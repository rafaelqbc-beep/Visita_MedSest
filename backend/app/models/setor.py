"""Model: Setores/Ambientes visitados."""
import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Setor(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "setores"

    chamado_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("chamados.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    descricao_ambiente: Mapped[str | None] = mapped_column(Text)
    ordem: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    chamado: Mapped["Chamado"] = relationship(back_populates="setores")  # noqa: F821
    cargos: Mapped[list["Cargo"]] = relationship(  # noqa: F821
        back_populates="setor", cascade="all, delete-orphan", order_by="Cargo.ordem"
    )
    fotos: Mapped[list["FotoSetor"]] = relationship(  # noqa: F821
        back_populates="setor", cascade="all, delete-orphan"
    )
