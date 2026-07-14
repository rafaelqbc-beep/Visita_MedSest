"""Model: Unidades MedSest."""
from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class UnidadeMedsest(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "unidades_medsest"

    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    cnpj: Mapped[str] = mapped_column(String(18), unique=True, nullable=False)
    endereco: Mapped[str | None] = mapped_column(Text)
    cidade: Mapped[str | None] = mapped_column(String(100))
    estado: Mapped[str | None] = mapped_column(String(2))
    cep: Mapped[str | None] = mapped_column(String(9))
    telefone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(200))
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    usuarios: Mapped[list["Usuario"]] = relationship(back_populates="unidade")  # noqa: F821
