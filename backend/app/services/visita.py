"""Regras de acesso aos dados coletados durante a visita (setores/cargos/fotos)."""
import uuid

from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chamado import Chamado
from app.models.enums import RoleEnum, StatusChamado
from app.models.usuario import Usuario
from app.utils.exceptions import AppException

_NAO_ENCONTRADO = AppException(
    status.HTTP_404_NOT_FOUND, "Chamado não encontrado.", "CHAMADO_NOT_FOUND"
)


def pode_ver_chamado(chamado: Chamado, usuario: Usuario) -> bool:
    """Mesma regra de `routers/chamados.py`: o técnico interno só enxerga o
    que já foi assinado e liberado no local."""
    if usuario.role == RoleEnum.ADMIN:
        return True
    if usuario.role == RoleEnum.GESTOR_COMERCIAL:
        return chamado.unidade_medsest_id == usuario.unidade_id
    if usuario.role == RoleEnum.TECNICO_EXTERNO:
        return chamado.tecnico_externo_id == usuario.id
    return (
        chamado.tecnico_interno_id == usuario.id
        and chamado.status == StatusChamado.FINALIZADO
    )


async def get_chamado_visivel(
    chamado_id: uuid.UUID, usuario: Usuario, db: AsyncSession
) -> Chamado:
    """Para leitura. 404 (não 403) quando não pode ver: não revela chamados alheios."""
    chamado = await db.get(Chamado, chamado_id)
    if chamado is None or not pode_ver_chamado(chamado, usuario):
        raise _NAO_ENCONTRADO
    return chamado


async def get_chamado_editavel(
    chamado_id: uuid.UUID, usuario: Usuario, db: AsyncSession
) -> Chamado:
    """Para escrita de setores/cargos/fotos.

    Só o técnico externo responsável (ou um ADMIN, como válvula de escape)
    edita, e só enquanto a visita está EM_ANDAMENTO. Depois de FINALIZADO os
    dados estão assinados pelo cliente — alterá-los invalidaria a assinatura.
    """
    chamado = await db.get(Chamado, chamado_id)
    if chamado is None:
        raise _NAO_ENCONTRADO

    responsavel = (
        usuario.role == RoleEnum.ADMIN
        or (
            usuario.role == RoleEnum.TECNICO_EXTERNO
            and chamado.tecnico_externo_id == usuario.id
        )
    )
    if not responsavel:
        # Quem nem enxerga o chamado recebe 404; quem enxerga mas não é o
        # responsável recebe 403, que é a informação útil.
        if not pode_ver_chamado(chamado, usuario):
            raise _NAO_ENCONTRADO
        raise AppException(
            status.HTTP_403_FORBIDDEN,
            "Apenas o técnico externo responsável pode editar os dados da visita.",
            "NAO_E_RESPONSAVEL",
        )

    if chamado.status != StatusChamado.EM_ANDAMENTO:
        raise AppException(
            status.HTTP_409_CONFLICT,
            f"A visita precisa estar EM_ANDAMENTO para ser editada (status atual: {chamado.status.value}).",
            "VISITA_NAO_EDITAVEL",
        )
    return chamado
