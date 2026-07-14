"""Model: Log de notificações (e-mail / WhatsApp)."""
import uuid

from sqlalchemy import Enum as SAEnum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.enums import CanalNotif, StatusNotif
from app.models.mixins import CreatedAtMixin, UUIDPrimaryKeyMixin


class NotificacaoLog(UUIDPrimaryKeyMixin, CreatedAtMixin, Base):
    __tablename__ = "notificacoes_log"

    chamado_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("chamados.id")
    )
    usuario_id: Mapped[uuid.UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("usuarios.id")
    )
    email_destinatario: Mapped[str | None] = mapped_column(String(200))
    tipo: Mapped[CanalNotif] = mapped_column(
        SAEnum(CanalNotif, name="canal_notif", values_callable=lambda e: [x.value for x in e]),
        nullable=False,
    )
    evento: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[StatusNotif] = mapped_column(
        SAEnum(StatusNotif, name="status_notif", values_callable=lambda e: [x.value for x in e]),
        nullable=False,
    )
    detalhes: Mapped[str | None] = mapped_column(Text)
