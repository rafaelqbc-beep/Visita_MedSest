"""Cargos/Funções registrados em cada setor durante a visita."""
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.cargo import Cargo
from app.models.setor import Setor
from app.models.usuario import Usuario
from app.schemas.cargo import CargoCreate, CargoRead, CargoUpdate
from app.services.visita import get_chamado_editavel, get_chamado_visivel
from app.utils.exceptions import AppException

router = APIRouter(prefix="/api/cargos", tags=["visita: cargos"])


async def _get_setor(setor_id: uuid.UUID, db: AsyncSession) -> Setor:
    setor = await db.get(Setor, setor_id)
    if setor is None:
        raise AppException(status.HTTP_404_NOT_FOUND, "Setor não encontrado.", "SETOR_NOT_FOUND")
    return setor


async def _get_cargo(cargo_id: uuid.UUID, db: AsyncSession) -> Cargo:
    cargo = await db.get(Cargo, cargo_id)
    if cargo is None:
        raise AppException(status.HTTP_404_NOT_FOUND, "Cargo não encontrado.", "CARGO_NOT_FOUND")
    return cargo


@router.get("", response_model=list[CargoRead])
async def listar_cargos(
    setor_id: uuid.UUID = Query(..., description="Setor cujos cargos serão listados"),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> list[CargoRead]:
    setor = await _get_setor(setor_id, db)
    await get_chamado_visivel(setor.chamado_id, usuario, db)
    cargos = (
        await db.scalars(
            select(Cargo).where(Cargo.setor_id == setor_id).order_by(Cargo.ordem, Cargo.created_at)
        )
    ).all()
    return [CargoRead.model_validate(c) for c in cargos]


@router.post("", response_model=CargoRead, status_code=status.HTTP_201_CREATED)
async def criar_cargo(
    body: CargoCreate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> CargoRead:
    setor = await _get_setor(body.setor_id, db)
    await get_chamado_editavel(setor.chamado_id, usuario, db)

    cargo = Cargo(**body.model_dump())
    db.add(cargo)
    await db.flush()
    await db.refresh(cargo)
    return CargoRead.model_validate(cargo)


@router.put("/{cargo_id}", response_model=CargoRead)
async def atualizar_cargo(
    cargo_id: uuid.UUID,
    body: CargoUpdate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> CargoRead:
    cargo = await _get_cargo(cargo_id, db)
    setor = await _get_setor(cargo.setor_id, db)
    await get_chamado_editavel(setor.chamado_id, usuario, db)

    for campo, valor in body.model_dump(exclude_unset=True).items():
        setattr(cargo, campo, valor)
    await db.flush()
    await db.refresh(cargo)
    return CargoRead.model_validate(cargo)


@router.delete("/{cargo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_cargo(
    cargo_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> None:
    cargo = await _get_cargo(cargo_id, db)
    setor = await _get_setor(cargo.setor_id, db)
    await get_chamado_editavel(setor.chamado_id, usuario, db)

    await db.delete(cargo)
    await db.flush()
