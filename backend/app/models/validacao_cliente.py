"""Model: Validações do cliente (rodadas de aprovação/comentários)."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import CreatedAtMixin, UUIDPrimaryKeyMixin


class ValidacaoCliente(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "validacoes_cliente"

    chamado_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("chamados.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    token_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    rodada: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")

    # Resposta do cliente ('APROVADO' | 'COMENTADO' | NULL enquanto pendente)
    status_resposta: Mapped[str | None] = mapped_column(String(20))
    comentarios: Mapped[str | None] = mapped_column(Text)
    dt_resposta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Auditoria
    ip_resposta: Mapped[str | None] = mapped_column(String(45))

    chamado: Mapped["Chamado"] = relationship(back_populates="validacoes")  # noqa: F821
