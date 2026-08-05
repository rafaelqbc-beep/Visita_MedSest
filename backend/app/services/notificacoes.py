"""Envio e registro de notificações (e-mail / WhatsApp).

E-MAIL: implementado via SMTP (aiosmtplib). Fica inativo enquanto o `.env` não
tiver `SMTP_HOST` + `SMTP_FROM_EMAIL` — nesse caso a tentativa é registrada em
`notificacoes_log` como FALHOU, com o motivo em `detalhes`, sem quebrar o fluxo.
Preenchidas as credenciais (ex.: Resend) e reiniciado o serviço, as MESMAS
chamadas passam a registrar ENVIADO — nenhum call site muda.

WHATSAPP: descartado por ora (decisão de 05/08). O stub segue registrando FALHOU.

Marcar ENVIADO para algo que nunca saiu tornaria o log de auditoria mentiroso —
por isso o status reflete o resultado real do envio.
"""
import mimetypes
import uuid
from datetime import date
from email.message import EmailMessage
from email.utils import formataddr

import aiosmtplib
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.chamado import Chamado
from app.models.cliente import Cliente
from app.models.enums import ROTULO_TIPO_VISITA, CanalNotif, StatusNotif
from app.models.notificacao import NotificacaoLog
from app.models.usuario import Usuario

# Eventos registrados no log
EVENTO_NOVO_CHAMADO = "NOVO_CHAMADO"
EVENTO_REAGENDAMENTO = "REAGENDAMENTO"
EVENTO_VISITA_LIBERADA = "VISITA_LIBERADA"
EVENTO_RECIBO_CLIENTE = "RECIBO_CLIENTE"


def _smtp_configurado() -> bool:
    # Host e remetente são obrigatórios; a autenticação (user/senha) é opcional —
    # há relays sem auth, e o servidor de teste local também não pede.
    return bool(settings.SMTP_HOST and settings.SMTP_FROM_EMAIL)


def _twilio_configurado() -> bool:
    return bool(
        settings.TWILIO_ACCOUNT_SID
        and settings.TWILIO_AUTH_TOKEN
        and settings.TWILIO_WHATSAPP_FROM
    )


async def _enviar_email(
    destinatario: str,
    assunto: str,
    corpo: str,
    anexos: list[tuple[str, bytes]] | None = None,
) -> tuple[bool, str]:
    """Tenta enviar um e-mail. Retorna (sucesso, detalhes).

    `anexos` é uma lista de (nome_do_arquivo, conteúdo).
    """
    resumo = f"Assunto: {assunto}"
    if anexos:
        resumo += f"; anexos: {', '.join(nome for nome, _ in anexos)}"
    if not _smtp_configurado():
        return False, f"SMTP não configurado; e-mail não enviado. {resumo}"

    msg = EmailMessage()
    msg["From"] = formataddr((settings.SMTP_FROM_NAME, settings.SMTP_FROM_EMAIL))
    msg["To"] = destinatario
    if settings.SMTP_REPLY_TO:
        msg["Reply-To"] = settings.SMTP_REPLY_TO
    msg["Subject"] = assunto
    msg.set_content(corpo)
    for nome, conteudo in anexos or []:
        tipo = mimetypes.guess_type(nome)[0] or "application/octet-stream"
        maintype, subtype = tipo.split("/", 1)
        msg.add_attachment(conteudo, maintype=maintype, subtype=subtype, filename=nome)

    porta = settings.SMTP_PORT
    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=porta,
            username=settings.SMTP_USER or None,
            password=settings.SMTP_PASSWORD or None,
            use_tls=porta == 465,       # SSL implícito (porta 465)
            start_tls=porta == 587,     # STARTTLS na porta padrão (587)
            timeout=20,
        )
    except Exception as exc:  # rede, auth, TLS: o motivo vai para o log
        return False, f"Falha ao enviar e-mail para {destinatario}: {exc}. {resumo}"
    return True, f"E-mail enviado para {destinatario}. {resumo}"


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
        f"  Tipo: {ROTULO_TIPO_VISITA[chamado.tipo_visita]}\n"
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


async def notificar_visita_liberada(chamado_id: uuid.UUID, db: AsyncSession) -> None:
    """E-mail ao técnico interno: visita assinada, dados liberados para o PGR."""
    chamado = await db.get(Chamado, chamado_id)
    if chamado is None or chamado.tecnico_interno_id is None:
        return

    tecnico = await db.get(Usuario, chamado.tecnico_interno_id)
    cliente = await db.get(Cliente, chamado.cliente_id)
    if tecnico is None:
        return

    razao = cliente.razao_social if cliente else "cliente"
    assunto = f"[MedSest] Visita liberada para elaboração do PGR — {razao}"
    corpo = (
        f"Olá, {tecnico.nome}.\n\n"
        f"A visita abaixo foi conferida e assinada no local pelo cliente e pelo "
        f"técnico. Os dados já estão liberados para você dar continuidade:\n"
        f"  Chamado: #{chamado.numero_chamado}\n"
        f"  Cliente: {razao}\n"
        f"  Tipo: {ROTULO_TIPO_VISITA[chamado.tipo_visita]}\n"
        f"  Assinado por: {chamado.assinatura_cliente_nome or '-'}\n\n"
        f"Acesse o MedSest Visita para visualizar e exportar o relatório."
    )

    sucesso, detalhes = await _enviar_email(tecnico.email, assunto, corpo)
    _registrar(
        db,
        chamado_id=chamado.id,
        usuario_id=tecnico.id,
        email_destinatario=tecnico.email,
        tipo=CanalNotif.EMAIL,
        evento=EVENTO_VISITA_LIBERADA,
        sucesso=sucesso,
        detalhes=detalhes,
    )


async def notificar_recibo_cliente(chamado_id: uuid.UUID, db: AsyncSession) -> None:
    """E-mail ao cliente: cópia em PDF do relatório assinado (sem pedir ação)."""
    chamado = await db.get(Chamado, chamado_id)
    if chamado is None:
        return

    cliente = await db.get(Cliente, chamado.cliente_id)
    if cliente is None:
        return

    if not cliente.email_contato:
        _registrar(
            db,
            chamado_id=chamado.id,
            usuario_id=None,
            email_destinatario=None,
            tipo=CanalNotif.EMAIL,
            evento=EVENTO_RECIBO_CLIENTE,
            sucesso=False,
            detalhes="Cliente não tem e-mail de contato cadastrado; recibo não enviado.",
        )
        return

    data_visita = (
        chamado.dt_fim_visita.strftime("%d/%m/%Y") if chamado.dt_fim_visita else "-"
    )
    assunto = f"[MedSest] Cópia do relatório de visita técnica — {cliente.razao_social}"
    corpo = (
        f"Olá, {cliente.nome_contato or cliente.razao_social}.\n\n"
        f"Segue a cópia do relatório da visita técnica realizada em {data_visita}, "
        f"conferido e assinado no local:\n"
        f"  Chamado: #{chamado.numero_chamado}\n"
        f"  Assinado por: {chamado.assinatura_cliente_nome or '-'}\n\n"
        f"Este e-mail é apenas um comprovante — não é necessária nenhuma ação de sua parte.\n"
        f"Em caso de dúvida, procure seu gestor comercial."
    )

    # Import local: pdf_export importa models, e um import no topo criaria
    # ciclo entre os módulos de serviço.
    from app.services.pdf_export import gerar_recibo_pdf

    anexos: list[tuple[str, bytes]] = []
    try:
        conteudo, nome_arquivo = await gerar_recibo_pdf(chamado.id, db)
        anexos.append((nome_arquivo, conteudo))
    except Exception as erro:  # noqa: BLE001
        # Falhar o PDF não pode derrubar o "finalizar visita": a visita já foi
        # assinada. Registra e segue com o e-mail sem anexo.
        _registrar(
            db,
            chamado_id=chamado.id,
            usuario_id=None,
            email_destinatario=cliente.email_contato,
            tipo=CanalNotif.EMAIL,
            evento=EVENTO_RECIBO_CLIENTE,
            sucesso=False,
            detalhes=f"Falha ao gerar o PDF do recibo: {erro}",
        )

    sucesso, detalhes = await _enviar_email(cliente.email_contato, assunto, corpo, anexos=anexos)
    _registrar(
        db,
        chamado_id=chamado.id,
        usuario_id=None,
        email_destinatario=cliente.email_contato,
        tipo=CanalNotif.EMAIL,
        evento=EVENTO_RECIBO_CLIENTE,
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
