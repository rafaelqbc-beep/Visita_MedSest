"""CRUD de Usuários (todos os perfis)."""
import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import require_roles
from app.models.enums import RoleEnum
from app.models.usuario import Usuario
from app.schemas.common import Page, PageParams, paginate
from app.schemas.usuario import UsuarioCreate, UsuarioRead, UsuarioUpdate
from app.utils.exceptions import AppException
from app.utils.security import hash_password

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])

# ADMIN e GESTOR podem listar/ver (ex.: gestor escolhe técnicos ao abrir chamado).
# Só ADMIN cria/edita usuários.
_LEITURA = require_roles(RoleEnum.ADMIN, RoleEnum.GESTOR_COMERCIAL)
_ESCRITA = require_roles(RoleEnum.ADMIN)


async def _get_or_404(usuario_id: uuid.UUID, db: AsyncSession) -> Usuario:
    usuario = await db.get(Usuario, usuario_id)
    if usuario is None:
        raise AppException(status.HTTP_404_NOT_FOUND, "Usuário não encontrado.", "USUARIO_NOT_FOUND")
    return usuario


@router.get("", response_model=Page[UsuarioRead])
async def listar_usuarios(
    params: PageParams = Depends(),
    search: str | None = Query(None, description="Busca por nome ou e-mail"),
    role: RoleEnum | None = Query(None),
    unidade_id: uuid.UUID | None = Query(None),
    ativo: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(_LEITURA),
) -> Page[UsuarioRead]:
    stmt = select(Usuario).order_by(Usuario.nome)
    if search:
        termo = f"%{search}%"
        stmt = stmt.where(or_(Usuario.nome.ilike(termo), Usuario.email.ilike(termo)))
    if role is not None:
        stmt = stmt.where(Usuario.role == role)
    if unidade_id is not None:
        stmt = stmt.where(Usuario.unidade_id == unidade_id)
    if ativo is not None:
        stmt = stmt.where(Usuario.ativo == ativo)

    rows, total, pages = await paginate(db, stmt, params)
    return Page[UsuarioRead](
        items=[UsuarioRead.model_validate(r) for r in rows],
        total=total, page=params.page, size=params.size, pages=pages,
    )


@router.get("/{usuario_id}", response_model=UsuarioRead)
async def obter_usuario(
    usuario_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(_LEITURA),
) -> UsuarioRead:
    return UsuarioRead.model_validate(await _get_or_404(usuario_id, db))


@router.post("", response_model=UsuarioRead, status_code=status.HTTP_201_CREATED)
async def criar_usuario(
    body: UsuarioCreate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(_ESCRITA),
) -> UsuarioRead:
    existe = await db.scalar(select(Usuario).where(Usuario.email == body.email))
    if existe:
        raise AppException(status.HTTP_409_CONFLICT, "Já existe usuário com este e-mail.", "EMAIL_DUPLICADO")

    dados = body.model_dump(exclude={"senha"})
    usuario = Usuario(**dados, senha_hash=hash_password(body.senha))
    db.add(usuario)
    await db.flush()
    await db.refresh(usuario)
    return UsuarioRead.model_validate(usuario)


@router.put("/{usuario_id}", response_model=UsuarioRead)
async def atualizar_usuario(
    usuario_id: uuid.UUID,
    body: UsuarioUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(_ESCRITA),
) -> UsuarioRead:
    usuario = await _get_or_404(usuario_id, db)
    dados = body.model_dump(exclude_unset=True)

    if "email" in dados and dados["email"] != usuario.email:
        existe = await db.scalar(select(Usuario).where(Usuario.email == dados["email"]))
        if existe:
            raise AppException(status.HTTP_409_CONFLICT, "Já existe usuário com este e-mail.", "EMAIL_DUPLICADO")

    if "senha" in dados:
        senha = dados.pop("senha")
        if senha:
            usuario.senha_hash = hash_password(senha)

    for campo, valor in dados.items():
        setattr(usuario, campo, valor)

    await db.flush()
    await db.refresh(usuario)
    return UsuarioRead.model_validate(usuario)
