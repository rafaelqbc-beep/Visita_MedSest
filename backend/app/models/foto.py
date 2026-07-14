"""Model: Fotos dos setores."""
import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import CreatedAtMixin, UUIDPrimaryKeyMixin


class FotoSetor(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "fotos_setor"

    setor_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("setores.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    caminho_arquivo: Mapped[str] = mapped_column(String(500), nullable=False)
    nome_original: Mapped[str | None] = mapped_column(String(255))
    descricao: Mapped[str | None] = mapped_column(String(500))
    tamanho_bytes: Mapped[int | None] = mapped_column(Integer)

    setor: Mapped["Setor"] = relationship(back_populates="fotos")  # noqa: F821
