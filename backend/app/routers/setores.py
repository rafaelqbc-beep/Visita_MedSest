"""Setores/Ambientes registrados durante a visita."""
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.foto import FotoSetor
from app.models.setor import Setor
from app.models.usuario import Usuario
from app.schemas.setor import SetorCreate, SetorDetalhe, SetorRead, SetorUpdate
from app.services.visita import get_chamado_editavel, get_chamado_visivel
from app.utils.exceptions import AppException
from app.utils.file_handler import remover_arquivo

router = APIRouter(prefix="/api/setores", tags=["visita: setores"])


async def _get_setor(setor_id: uuid.UUID, db: AsyncSession) -> Setor:
    setor = await db.get(Setor, setor_id)
    if setor is None:
        raise AppException(status.HTTP_404_NOT_FOUND, "Setor não encontrado.", "SETOR_NOT_FOUND")
    return setor


@router.get("", response_model=list[SetorDetalhe])
async def listar_setores(
    chamado_id: uuid.UUID = Query(..., description="Chamado cujos setores serão listados"),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> list[SetorDetalhe]:
    """Setores do chamado com cargos e fotos aninhados.

    Sem paginação: a lista é limitada aos setores de um único chamado.
    """
    await get_chamado_visivel(chamado_id, usuario, db)
    setores = (
        await db.scalars(
            select(Setor)
            .where(Setor.chamado_id == chamado_id)
            .options(selectinload(Setor.cargos), selectinload(Setor.fotos))
            .order_by(Setor.ordem, Setor.created_at)
        )
    ).all()
    return [SetorDetalhe.model_validate(s) for s in setores]


@router.post("", response_model=SetorRead, status_code=status.HTTP_201_CREATED)
async def criar_setor(
    body: SetorCreate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> SetorRead:
    await get_chamado_editavel(body.chamado_id, usuario, db)
    setor = Setor(**body.model_dump())
    db.add(setor)
    await db.flush()
    await db.refresh(setor)
    return SetorRead.model_validate(setor)


@router.put("/{setor_id}", response_model=SetorRead)
async def atualizar_setor(
    setor_id: uuid.UUID,
    body: SetorUpdate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> SetorRead:
    setor = await _get_setor(setor_id, db)
    await get_chamado_editavel(setor.chamado_id, usuario, db)

    for campo, valor in body.model_dump(exclude_unset=True).items():
        setattr(setor, campo, valor)
    await db.flush()
    await db.refresh(setor)
    return SetorRead.model_validate(setor)


@router.delete("/{setor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_setor(
    setor_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> None:
    setor = await _get_setor(setor_id, db)
    await get_chamado_editavel(setor.chamado_id, usuario, db)

    # Cargos e fotos saem junto pelo cascade do banco, mas os arquivos em disco
    # precisam ser apagados na mão para não virarem órfãos em uploads/.
    caminhos = (
        await db.scalars(select(FotoSetor.caminho_arquivo).where(FotoSetor.setor_id == setor_id))
    ).all()
    for caminho in caminhos:
        remover_arquivo(caminho)

    await db.delete(setor)
    await db.flush()
