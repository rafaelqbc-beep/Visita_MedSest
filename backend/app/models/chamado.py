"""Model: Chamados de visita."""
import uuid
from datetime import date, datetime

from sqlalchemy import (
    DECIMAL,
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import StatusChamado, TipoVisitaEnum
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Chamado(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "chamados"

    numero_chamado: Mapped[int] = mapped_column(Integer, unique=True, autoincrement=True)

    cliente_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("clientes.id"), nullable=False, index=True
    )
    unidade_medsest_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("unidades_medsest.id"), nullable=False
    )
    gestor_comercial_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False
    )
    tecnico_externo_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("usuarios.id"), index=True
    )
    tecnico_interno_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("usuarios.id"), index=True
    )

    tipo_visita: Mapped[TipoVisitaEnum] = mapped_column(
        SAEnum(TipoVisitaEnum, name="tipo_visita_enum", values_callable=lambda e: [x.value for x in e]),
        nullable=False,
        index=True,
    )
    recomendacoes: Mapped[str | None] = mapped_column(Text)
    data_proposta: Mapped[date | None] = mapped_column(Date)
    data_visita_alterada: Mapped[date | None] = mapped_column(Date)

    status: Mapped[StatusChamado] = mapped_column(
        SAEnum(StatusChamado, name="status_chamado", values_callable=lambda e: [x.value for x in e]),
        default=StatusChamado.PENDENTE,
        server_default=StatusChamado.PENDENTE.value,
        nullable=False,
        index=True,
    )

    # Timestamps de rastreio (UTC)
    dt_abertura: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dt_inicio_visita: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dt_fim_visita: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    geoloc_latitude: Mapped[float | None] = mapped_column(DECIMAL(10, 8))
    geoloc_longitude: Mapped[float | None] = mapped_column(DECIMAL(11, 8))

    # Timestamps do fluxo de validação pelo cliente
    dt_email_validacao_enviado: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dt_cliente_aprovou: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dt_cliente_comentou: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Timestamps do técnico interno
    dt_liberado_tecnico_interno: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dt_exportacao_word: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    rodadas_validacao: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    # Relacionamentos
    cliente: Mapped["Cliente"] = relationship("Cliente")  # noqa: F821
    unidade_medsest: Mapped["UnidadeMedsest"] = relationship("UnidadeMedsest")  # noqa: F821
    gestor_comercial: Mapped["Usuario"] = relationship("Usuario", foreign_keys=[gestor_comercial_id])  # noqa: F821
    tecnico_externo: Mapped["Usuario | None"] = relationship("Usuario", foreign_keys=[tecnico_externo_id])  # noqa: F821
    tecnico_interno: Mapped["Usuario | None"] = relationship("Usuario", foreign_keys=[tecnico_interno_id])  # noqa: F821

    setores: Mapped[list["Setor"]] = relationship(  # noqa: F821
        back_populates="chamado", cascade="all, delete-orphan", order_by="Setor.ordem"
    )
    validacoes: Mapped[list["ValidacaoCliente"]] = relationship(  # noqa: F821
        back_populates="chamado", cascade="all, delete-orphan", order_by="ValidacaoCliente.rodada"
    )
