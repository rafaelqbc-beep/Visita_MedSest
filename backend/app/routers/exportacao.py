"""Exportação dos relatórios da visita."""
import uuid
from datetime import datetime, timezone
from urllib.parse import quote

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.enums import RoleEnum, StatusChamado
from app.models.usuario import Usuario
from app.services.pdf_export import gerar_recibo_pdf
from app.services.visita import get_chamado_visivel
from app.services.word_export import gerar_relatorio_word
from app.utils.exceptions import AppException

router = APIRouter(prefix="/api/chamados", tags=["exportação"])

MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def _content_disposition(nome_arquivo: str) -> str:
    # filename* (RFC 5987) preserva acentos no nome; filename= é o fallback.
    return f"attachment; filename=\"{nome_arquivo}\"; filename*=UTF-8''{quote(nome_arquivo)}"


async def _get_chamado_exportavel(chamado_id: uuid.UUID, usuario: Usuario, db: AsyncSession):
    """O relatório é o entregável do técnico interno; ADMIN acessa para suporte."""
    if usuario.role not in (RoleEnum.TECNICO_INTERNO, RoleEnum.ADMIN):
        raise AppException(
            status.HTTP_403_FORBIDDEN,
            "Apenas o técnico interno responsável pode exportar o relatório.",
            "EXPORTACAO_NAO_PERMITIDA",
        )
    # Para TECNICO_INTERNO isto já garante "atribuído a ele E finalizado";
    # a checagem de status abaixo cobre o ADMIN.
    chamado = await get_chamado_visivel(chamado_id, usuario, db)
    if chamado.status != StatusChamado.FINALIZADO:
        raise AppException(
            status.HTTP_409_CONFLICT,
            f"O relatório só fica disponível após a visita ser assinada e finalizada "
            f"(status atual: {chamado.status.value}).",
            "CHAMADO_NAO_FINALIZADO",
        )
    return chamado


@router.get("/{chamado_id}/exportar-word")
async def exportar_word(
    chamado_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> Response:
    """Baixa o relatório .docx com setores, cargos, fotos e as assinaturas."""
    chamado = await _get_chamado_exportavel(chamado_id, usuario, db)

    conteudo, nome_arquivo = await gerar_relatorio_word(chamado_id, db)

    # Só o primeiro download marca a data: o KPI de tempo até a exportação mede
    # a entrega, e reexportar não é uma nova entrega.
    if chamado.dt_exportacao_word is None:
        chamado.dt_exportacao_word = datetime.now(timezone.utc)
        await db.flush()

    return Response(
        content=conteudo,
        media_type=MIME_DOCX,
        headers={"Content-Disposition": _content_disposition(nome_arquivo)},
    )


@router.get("/{chamado_id}/recibo-pdf")
async def baixar_recibo_pdf(
    chamado_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> Response:
    """Comprovante assinado em PDF — o mesmo que é enviado ao cliente por e-mail.

    Aqui a regra é a de visibilidade do chamado: o gestor comercial precisa
    conseguir reenviar/mostrar o comprovante ao cliente.
    """
    chamado = await get_chamado_visivel(chamado_id, usuario, db)
    if chamado.status != StatusChamado.FINALIZADO:
        raise AppException(
            status.HTTP_409_CONFLICT,
            f"O comprovante só existe após a visita ser assinada e finalizada "
            f"(status atual: {chamado.status.value}).",
            "CHAMADO_NAO_FINALIZADO",
        )

    conteudo, nome_arquivo = await gerar_recibo_pdf(chamado_id, db)
    return Response(
        content=conteudo,
        media_type="application/pdf",
        headers={"Content-Disposition": _content_disposition(nome_arquivo)},
    )
