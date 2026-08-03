"""Catálogo de riscos e EPIs — dados de referência para a tela de campo.

A tela do técnico monta o acordeão de riscos (por categoria) e a lista de EPIs
(por grupo) a partir daqui, e o frontend traduz os códigos gravados para rótulo.
É estático (vem do código), então qualquer autenticado pode ler.
"""
from fastapi import APIRouter, Depends

from app.middleware.auth import get_current_user
from app.models.catalogo import epis_por_grupo, riscos_por_categoria
from app.models.usuario import Usuario

router = APIRouter(prefix="/api/catalogo", tags=["catálogo"])


@router.get("")
async def obter_catalogo(_: Usuario = Depends(get_current_user)) -> dict:
    """Riscos agrupados por categoria e EPIs agrupados por região do corpo."""
    return {
        "riscos": riscos_por_categoria(),
        "epis": epis_por_grupo(),
    }
