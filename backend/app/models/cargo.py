"""Model: Cargos/Funções por setor."""
import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
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

    # --- Campos de PGR (a exposição é da função) ---
    num_trabalhadores: Mapped[int | None] = mapped_column(Integer)
    jornada: Mapped[str | None] = mapped_column(String(200))
    # Booleanos nullable de propósito: null = não informado, false = declarou que
    # não há, true = há. Lista vazia não distingue "verificou" de "não preencheu".
    possui_riscos: Mapped[bool | None] = mapped_column(Boolean)
    riscos: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, default=list, server_default="{}"
    )
    riscos_outros: Mapped[str | None] = mapped_column(Text)
    utiliza_epis: Mapped[bool | None] = mapped_column(Boolean)
    epis: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, default=list, server_default="{}"
    )
    epis_outros: Mapped[str | None] = mapped_column(Text)

    setor: Mapped["Setor"] = relationship(back_populates="cargos")  # noqa: F821
