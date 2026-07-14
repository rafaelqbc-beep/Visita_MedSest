"""CRUD de Clientes (empresas visitadas)."""
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import require_roles
from app.models.cliente import Cliente
from app.models.enums import RoleEnum, TipoVisitaEnum
from app.models.unidade import UnidadeMedsest
from app.models.usuario import Usuario
from app.schemas.cliente import ClienteCreate, ClienteRead, ClienteUpdate
from app.schemas.common import Page, PageParams, paginate
from app.utils.exceptions import AppException

router = APIRouter(prefix="/api/clientes", tags=["clientes"])

_ACESSO = require_roles(RoleEnum.ADMIN, RoleEnum.GESTOR_COMERCIAL)


async def _get_or_404(cliente_id: uuid.UUID, db: AsyncSession) -> Cliente:
    cliente = await db.get(Cliente, cliente_id)
    if cliente is None:
        raise AppException(status.HTTP_404_NOT_FOUND, "Cliente não encontrado.", "CLIENTE_NOT_FOUND")
    return cliente


async def _validar_fks(
    db: AsyncSession, gestor_id: uuid.UUID | None, unidade_id: uuid.UUID | None
) -> None:
    if gestor_id is not None:
        gestor = await db.get(Usuario, gestor_id)
        if gestor is None or gestor.role != RoleEnum.GESTOR_COMERCIAL:
            raise AppException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "gestor_comercial_id inválido (usuário não é gestor comercial).",
                "GESTOR_INVALIDO",
            )
    if unidade_id is not None:
        unidade = await db.get(UnidadeMedsest, unidade_id)
        if unidade is None:
            raise AppException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "unidade_medsest_id inválido.",
                "UNIDADE_INVALIDA",
            )


@router.get("", response_model=Page[ClienteRead])
async def listar_clientes(
    params: PageParams = Depends(),
    search: str | None = Query(None, description="Busca por razão social, nome fantasia ou CNPJ"),
    unidade_id: uuid.UUID | None = Query(None),
    tipo_visita: TipoVisitaEnum | None = Query(None, description="Filtra pelo tipo de visita padrão"),
    ativo: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(_ACESSO),
) -> Page[ClienteRead]:
    stmt = select(Cliente).order_by(Cliente.razao_social)
    if search:
        termo = f"%{search}%"
        stmt = stmt.where(
            or_(
                Cliente.razao_social.ilike(termo),
                Cliente.nome_fantasia.ilike(termo),
                Cliente.cnpj.ilike(termo),
            )
        )
    if unidade_id is not None:
        stmt = stmt.where(Cliente.unidade_medsest_id == unidade_id)
    if tipo_visita is not None:
        stmt = stmt.where(Cliente.tipo_visita_padrao == tipo_visita)
    if ativo is not None:
        stmt = stmt.where(Cliente.ativo == ativo)

    rows, total, pages = await paginate(db, stmt, params)
    return Page[ClienteRead](
        items=[ClienteRead.model_validate(r) for r in rows],
        total=total, page=params.page, size=params.size, pages=pages,
    )


@router.get("/{cliente_id}", response_model=ClienteRead)
async def obter_cliente(
    cliente_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(_ACESSO),
) -> ClienteRead:
    return ClienteRead.model_validate(await _get_or_404(cliente_id, db))


@router.post("", response_model=ClienteRead, status_code=status.HTTP_201_CREATED)
async def criar_cliente(
    body: ClienteCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(_ACESSO),
) -> ClienteRead:
    await _validar_fks(db, body.gestor_comercial_id, body.unidade_medsest_id)
    cliente = Cliente(**body.model_dump())
    db.add(cliente)
    await db.flush()
    await db.refresh(cliente)
    return ClienteRead.model_validate(cliente)


@router.put("/{cliente_id}", response_model=ClienteRead)
async def atualizar_cliente(
    cliente_id: uuid.UUID,
    body: ClienteUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(_ACESSO),
) -> ClienteRead:
    cliente = await _get_or_404(cliente_id, db)
    dados = body.model_dump(exclude_unset=True)
    await _validar_fks(
        db,
        dados.get("gestor_comercial_id", cliente.gestor_comercial_id),
        dados.get("unidade_medsest_id", cliente.unidade_medsest_id),
    )
    for campo, valor in dados.items():
        setattr(cliente, campo, valor)
    await db.flush()
    await db.refresh(cliente)
    return ClienteRead.model_validate(cliente)
