"""Model: Clientes (empresas visitadas)."""
import uuid

from sqlalchemy import Boolean, Enum as SAEnum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import TipoVisitaEnum
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Cliente(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "clientes"

    razao_social: Mapped[str] = mapped_column(String(300), nullable=False)
    cnpj: Mapped[str | None] = mapped_column(String(18))
    nome_fantasia: Mapped[str | None] = mapped_column(String(200))
    filial: Mapped[str | None] = mapped_column(String(100))
    endereco: Mapped[str | None] = mapped_column(Text)
    cidade: Mapped[str | None] = mapped_column(String(100))
    estado: Mapped[str | None] = mapped_column(String(2))
    cep: Mapped[str | None] = mapped_column(String(9))
    nome_contato: Mapped[str | None] = mapped_column(String(200))
    celular_contato: Mapped[str | None] = mapped_column(String(20))
    email_contato: Mapped[str | None] = mapped_column(String(200))
    # Tipo de visita padrão (pré-seleciona ao abrir chamado para este cliente)
    tipo_visita_padrao: Mapped[TipoVisitaEnum | None] = mapped_column(
        SAEnum(TipoVisitaEnum, name="tipo_visita_enum", values_callable=lambda e: [x.value for x in e])
    )
    gestor_comercial_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("usuarios.id")
    )
    unidade_medsest_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("unidades_medsest.id")
    )
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    gestor_comercial: Mapped["Usuario | None"] = relationship("Usuario")  # noqa: F821
    unidade_medsest: Mapped["UnidadeMedsest | None"] = relationship("UnidadeMedsest")  # noqa: F821
