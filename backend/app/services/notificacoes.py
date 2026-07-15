"""Envio e registro de notificações (e-mail / WhatsApp).

ESTADO ATUAL: o envio real ainda não está implementado — falta configurar
SMTP (fastapi-mail) e Twilio. Até lá, cada tentativa é registrada em
`notificacoes_log` com status FALHOU e o motivo em `detalhes`.

Isso é proposital: marcar ENVIADO para uma mensagem que nunca saiu tornaria o
log de auditoria mentiroso. Quando as credenciais forem configuradas e o envio
implementado, as mesmas chamadas passam a registrar ENVIADO.
"""
import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.chamado import Chamado
from app.models.cliente import Cliente
from app.models.enums import CanalNotif, StatusNotif
from app.models.notificacao import NotificacaoLog
from app.models.usuario import Usuario

# Eventos registrados no log
EVENTO_NOVO_CHAMADO = "NOVO_CHAMADO"
EVENTO_REAGENDAMENTO = "REAGENDAMENTO"


def _smtp_configurado() -> bool:
    return bool(settings.SMTP_USER and settings.SMTP_PASSWORD)


def _twilio_configurado() -> bool:
    return bool(
        settings.TWILIO_ACCOUNT_SID
        and settings.TWILIO_AUTH_TOKEN
        and settings.TWILIO_WHATSAPP_FROM
    )


async def _enviar_email(destinatario: str, assunto: str, corpo: str) -> tuple[bool, str]:
    """Tenta enviar um e-mail. Retorna (sucesso, detalhes)."""
    if not _smtp_configurado():
        return False, f"SMTP não configurado; e-mail não enviado. Assunto: {assunto}"
    # TODO(sessão futura): integrar fastapi-mail e enviar de verdade.
    return False, f"Envio de e-mail ainda não implementado. Assunto: {assunto}"


async def _enviar_whatsapp(numero: str, mensagem: str) -> tuple[bool, str]:
    """Tenta enviar uma mensagem de WhatsApp. Retorna (sucesso, detalhes)."""
    if not _twilio_configurado():
        return False, "Twilio não configurado; WhatsApp não enviado."
    # TODO(sessão futura): integrar o SDK do Twilio e enviar de verdade.
    return False, "Envio de WhatsApp ainda não implementado."


def _registrar(
    db: AsyncSession,
    *,
    chamado_id: uuid.UUID | None,
    usuario_id: uuid.UUID | None,
    email_destinatario: str | None,
    tipo: CanalNotif,
    evento: str,
    sucesso: bool,
    detalhes: str,
) -> None:
    db.add(
        NotificacaoLog(
            chamado_id=chamado_id,
            usuario_id=usuario_id,
            email_destinatario=email_destinatario,
            tipo=tipo,
            evento=evento,
            status=StatusNotif.ENVIADO if sucesso else StatusNotif.FALHOU,
            detalhes=detalhes,
        )
    )


async def notificar_novo_chamado(chamado_id: uuid.UUID, db: AsyncSession) -> None:
    """E-mail + WhatsApp ao técnico externo: novo chamado aberto para ele."""
    chamado = await db.get(Chamado, chamado_id)
    if chamado is None or chamado.tecnico_externo_id is None:
        return

    tecnico = await db.get(Usuario, chamado.tecnico_externo_id)
    cliente = await db.get(Cliente, chamado.cliente_id)
    if tecnico is None:
        return

    razao = cliente.razao_social if cliente else "cliente"
    data = chamado.data_proposta.strftime("%d/%m/%Y") if chamado.data_proposta else "a definir"

    assunto = f"[MedSest] Nova visita atribuída — {razao}"
    corpo = (
        f"Olá, {tecnico.nome}.\n\n"
        f"Uma nova visita foi atribuída a você:\n"
        f"  Chamado: #{chamado.numero_chamado}\n"
        f"  Cliente: {razao}\n"
        f"  Tipo: {chamado.tipo_visita.value}\n"
        f"  Data proposta: {data}\n\n"
        f"Acesse o MedSest Visita para ver os detalhes."
    )

    sucesso, detalhes = await _enviar_email(tecnico.email, assunto, corpo)
    _registrar(
        db,
        chamado_id=chamado.id,
        usuario_id=tecnico.id,
        email_destinatario=tecnico.email,
        tipo=CanalNotif.EMAIL,
        evento=EVENTO_NOVO_CHAMADO,
        sucesso=sucesso,
        detalhes=detalhes,
    )

    if tecnico.whatsapp:
        msg = (
            f"MedSest: nova visita #{chamado.numero_chamado} para {razao} "
            f"em {data}. Acesse o sistema para detalhes."
        )
        sucesso_wpp, detalhes_wpp = await _enviar_whatsapp(tecnico.whatsapp, msg)
        _registrar(
            db,
            chamado_id=chamado.id,
            usuario_id=tecnico.id,
            email_destinatario=None,
            tipo=CanalNotif.WHATSAPP,
            evento=EVENTO_NOVO_CHAMADO,
            sucesso=sucesso_wpp,
            detalhes=detalhes_wpp,
        )


async def notificar_reagendamento(
    chamado_id: uuid.UUID, nova_data: date, db: AsyncSession
) -> None:
    """E-mail ao gestor comercial: o técnico externo alterou a data da visita."""
    chamado = await db.get(Chamado, chamado_id)
    if chamado is None:
        return

    gestor = await db.get(Usuario, chamado.gestor_comercial_id)
    cliente = await db.get(Cliente, chamado.cliente_id)
    if gestor is None:
        return

    razao = cliente.razao_social if cliente else "cliente"
    tecnico_nome = "-"
    if chamado.tecnico_externo_id:
        tecnico = await db.get(Usuario, chamado.tecnico_externo_id)
        if tecnico:
            tecnico_nome = tecnico.nome

    original = chamado.data_proposta.strftime("%d/%m/%Y") if chamado.data_proposta else "-"
    assunto = f"[MedSest] Visita reagendada — {razao}"
    corpo = (
        f"Olá, {gestor.nome}.\n\n"
        f"O técnico {tecnico_nome} alterou a data da visita:\n"
        f"  Chamado: #{chamado.numero_chamado}\n"
        f"  Cliente: {razao}\n"
        f"  Data original: {original}\n"
        f"  Nova data: {nova_data.strftime('%d/%m/%Y')}\n"
    )

    sucesso, detalhes = await _enviar_email(gestor.email, assunto, corpo)
    _registrar(
        db,
        chamado_id=chamado.id,
        usuario_id=gestor.id,
        email_destinatario=gestor.email,
        tipo=CanalNotif.EMAIL,
        evento=EVENTO_REAGENDAMENTO,
        sucesso=sucesso,
        detalhes=detalhes,
    )


async def listar_notificacoes_chamado(
    chamado_id: uuid.UUID, db: AsyncSession
) -> list[NotificacaoLog]:
    """Histórico de notificações de um chamado (mais recentes primeiro)."""
    return list(
        (
            await db.scalars(
                select(NotificacaoLog)
                .where(NotificacaoLog.chamado_id == chamado_id)
                .order_by(NotificacaoLog.created_at.desc())
            )
        ).all()
    )
