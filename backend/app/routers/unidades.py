"""CRUD de Unidades MedSest."""
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user, require_roles
from app.models.enums import RoleEnum
from app.models.unidade import UnidadeMedsest
from app.models.usuario import Usuario
from app.schemas.common import Page, PageParams, paginate
from app.schemas.unidade import UnidadeCreate, UnidadeRead, UnidadeUpdate
from app.utils.exceptions import AppException

router = APIRouter(prefix="/api/unidades", tags=["unidades"])


async def _get_or_404(unidade_id: uuid.UUID, db: AsyncSession) -> UnidadeMedsest:
    unidade = await db.get(UnidadeMedsest, unidade_id)
    if unidade is None:
        raise AppException(status.HTTP_404_NOT_FOUND, "Unidade não encontrada.", "UNIDADE_NOT_FOUND")
    return unidade


@router.get("", response_model=Page[UnidadeRead])
async def listar_unidades(
    params: PageParams = Depends(),
    search: str | None = Query(None, description="Busca por nome ou CNPJ"),
    ativo: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
) -> Page[UnidadeRead]:
    stmt = select(UnidadeMedsest).order_by(UnidadeMedsest.nome)
    if search:
        termo = f"%{search}%"
        stmt = stmt.where(or_(UnidadeMedsest.nome.ilike(termo), UnidadeMedsest.cnpj.ilike(termo)))
    if ativo is not None:
        stmt = stmt.where(UnidadeMedsest.ativo == ativo)

    rows, total, pages = await paginate(db, stmt, params)
    return Page[UnidadeRead](
        items=[UnidadeRead.model_validate(r) for r in rows],
        total=total, page=params.page, size=params.size, pages=pages,
    )


@router.get("/{unidade_id}", response_model=UnidadeRead)
async def obter_unidade(
    unidade_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
) -> UnidadeRead:
    return UnidadeRead.model_validate(await _get_or_404(unidade_id, db))


@router.post("", response_model=UnidadeRead, status_code=status.HTTP_201_CREATED)
async def criar_unidade(
    body: UnidadeCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_roles(RoleEnum.ADMIN)),
) -> UnidadeRead:
    existe = await db.scalar(select(UnidadeMedsest).where(UnidadeMedsest.cnpj == body.cnpj))
    if existe:
        raise AppException(status.HTTP_409_CONFLICT, "Já existe unidade com este CNPJ.", "CNPJ_DUPLICADO")

    unidade = UnidadeMedsest(**body.model_dump())
    db.add(unidade)
    await db.flush()
    await db.refresh(unidade)
    return UnidadeRead.model_validate(unidade)


@router.put("/{unidade_id}", response_model=UnidadeRead)
async def atualizar_unidade(
    unidade_id: uuid.UUID,
    body: UnidadeUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(require_roles(RoleEnum.ADMIN)),
) -> UnidadeRead:
    unidade = await _get_or_404(unidade_id, db)
    for campo, valor in body.model_dump(exclude_unset=True).items():
        setattr(unidade, campo, valor)
    await db.flush()
    await db.refresh(unidade)
    return UnidadeRead.model_validate(unidade)
