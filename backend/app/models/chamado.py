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
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import StatusChamado, TipoVisitaEnum
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Chamado(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "chamados"

    # Preenchido pela sequence no banco (SERIAL) — o model apenas espelha o server_default
    numero_chamado: Mapped[int] = mapped_column(
        Integer,
        unique=True,
        server_default=text("nextval('chamados_numero_chamado_seq')"),
    )

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

    # --- Conferência e assinaturas no local (substitui a validação por e-mail) ---
    # Cliente: assina no tablet (dedo/caneta) e se identifica com nome e CPF.
    assinatura_cliente_caminho: Mapped[str | None] = mapped_column(String(500))
    assinatura_cliente_nome: Mapped[str | None] = mapped_column(String(200))
    assinatura_cliente_cpf: Mapped[str | None] = mapped_column(String(14))
    dt_assinatura_cliente: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Técnico externo: identidade vem do usuário logado, basta o traço + timestamp.
    assinatura_tecnico_caminho: Mapped[str | None] = mapped_column(String(500))
    dt_assinatura_tecnico: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Geolocalização no momento da assinatura (evidência de que foi feita no local)
    geoloc_assinatura_latitude: Mapped[float | None] = mapped_column(DECIMAL(10, 8))
    geoloc_assinatura_longitude: Mapped[float | None] = mapped_column(DECIMAL(11, 8))

    # Timestamps do técnico interno
    dt_liberado_tecnico_interno: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dt_exportacao_word: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relacionamentos
    cliente: Mapped["Cliente"] = relationship("Cliente")  # noqa: F821
    unidade_medsest: Mapped["UnidadeMedsest"] = relationship("UnidadeMedsest")  # noqa: F821
    gestor_comercial: Mapped["Usuario"] = relationship("Usuario", foreign_keys=[gestor_comercial_id])  # noqa: F821
    tecnico_externo: Mapped["Usuario | None"] = relationship("Usuario", foreign_keys=[tecnico_externo_id])  # noqa: F821
    tecnico_interno: Mapped["Usuario | None"] = relationship("Usuario", foreign_keys=[tecnico_interno_id])  # noqa: F821

    setores: Mapped[list["Setor"]] = relationship(  # noqa: F821
        back_populates="chamado", cascade="all, delete-orphan", order_by="Setor.ordem"
    )
