"""CRUD de Chamados de visita, com round-robin e notificações."""
import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import Select, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.middleware.auth import get_current_user, require_roles
from app.models.chamado import Chamado
from app.models.cliente import Cliente
from app.models.enums import RoleEnum, StatusChamado, TipoVisitaEnum
from app.models.usuario import Usuario
from app.schemas.chamado import (
    ChamadoCreate,
    ChamadoListItem,
    ChamadoRead,
    ChamadoUpdate,
    ReagendarRequest,
)
from app.schemas.common import Page, PageParams, paginate
from app.services.notificacoes import notificar_novo_chamado, notificar_reagendamento
from app.services.round_robin import get_proximo_tecnico_interno
from app.utils.exceptions import AppException

router = APIRouter(prefix="/api/chamados", tags=["chamados"])

_GESTAO = require_roles(RoleEnum.ADMIN, RoleEnum.GESTOR_COMERCIAL)

# Depois de finalizado ou cancelado o chamado fica travado; só a troca de
# técnicos continua permitida (o gestor pode remanejar a qualquer momento).
_STATUS_TRAVADOS = (StatusChamado.FINALIZADO, StatusChamado.CANCELADO)
_CAMPOS_LIVRES_APOS_TRAVA = {"tecnico_externo_id", "tecnico_interno_id"}


def _agora() -> datetime:
    return datetime.now(timezone.utc)


def _aplicar_escopo(stmt: Select, usuario: Usuario) -> Select:
    """Restringe a consulta ao que cada perfil pode enxergar."""
    if usuario.role == RoleEnum.ADMIN:
        return stmt  # administrador enxerga todas as unidades
    if usuario.role == RoleEnum.GESTOR_COMERCIAL:
        return stmt.where(Chamado.unidade_medsest_id == usuario.unidade_id)
    if usuario.role == RoleEnum.TECNICO_EXTERNO:
        return stmt.where(Chamado.tecnico_externo_id == usuario.id)
    # Técnico interno só acessa o que já foi assinado e liberado no local.
    return stmt.where(
        Chamado.tecnico_interno_id == usuario.id,
        Chamado.status == StatusChamado.FINALIZADO,
    )


def _pode_ver(chamado: Chamado, usuario: Usuario) -> bool:
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


async def _get_visivel_ou_404(
    chamado_id: uuid.UUID, usuario: Usuario, db: AsyncSession
) -> Chamado:
    chamado = await db.get(Chamado, chamado_id)
    if chamado is None or not _pode_ver(chamado, usuario):
        # 404 em vez de 403: não revela a existência de chamados de outros.
        raise AppException(status.HTTP_404_NOT_FOUND, "Chamado não encontrado.", "CHAMADO_NOT_FOUND")
    return chamado


async def _validar_tecnico(
    db: AsyncSession, tecnico_id: uuid.UUID | None, role: RoleEnum, campo: str
) -> None:
    if tecnico_id is None:
        return
    tecnico = await db.get(Usuario, tecnico_id)
    if tecnico is None or tecnico.role != role or not tecnico.ativo:
        raise AppException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"{campo} inválido (usuário inexistente, inativo ou de outro perfil).",
            "TECNICO_INVALIDO",
        )


def _para_item(chamado: Chamado) -> ChamadoListItem:
    item = ChamadoListItem.model_validate(chamado)
    item.cliente_razao_social = chamado.cliente.razao_social if chamado.cliente else None
    item.cliente_cidade = chamado.cliente.cidade if chamado.cliente else None
    item.tecnico_externo_nome = chamado.tecnico_externo.nome if chamado.tecnico_externo else None
    item.tecnico_interno_nome = chamado.tecnico_interno.nome if chamado.tecnico_interno else None
    return item


@router.get("", response_model=Page[ChamadoListItem])
async def listar_chamados(
    params: PageParams = Depends(),
    status_: StatusChamado | None = Query(None, alias="status"),
    tipo_visita: TipoVisitaEnum | None = Query(None),
    cliente_id: uuid.UUID | None = Query(None),
    tecnico_externo_id: uuid.UUID | None = Query(None),
    tecnico_interno_id: uuid.UUID | None = Query(None),
    unidade_id: uuid.UUID | None = Query(None, description="Só tem efeito para ADMIN"),
    periodo_inicio: date | None = Query(None, description="Filtra dt_abertura >= "),
    periodo_fim: date | None = Query(None, description="Filtra dt_abertura <= "),
    search: str | None = Query(None, description="Número do chamado ou razão social"),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> Page[ChamadoListItem]:
    stmt = (
        select(Chamado)
        .options(
            selectinload(Chamado.cliente),
            selectinload(Chamado.tecnico_externo),
            selectinload(Chamado.tecnico_interno),
        )
        .order_by(Chamado.numero_chamado.desc())
    )
    stmt = _aplicar_escopo(stmt, usuario)

    if status_ is not None:
        stmt = stmt.where(Chamado.status == status_)
    if tipo_visita is not None:
        stmt = stmt.where(Chamado.tipo_visita == tipo_visita)
    if cliente_id is not None:
        stmt = stmt.where(Chamado.cliente_id == cliente_id)
    if tecnico_externo_id is not None:
        stmt = stmt.where(Chamado.tecnico_externo_id == tecnico_externo_id)
    if tecnico_interno_id is not None:
        stmt = stmt.where(Chamado.tecnico_interno_id == tecnico_interno_id)
    if unidade_id is not None and usuario.role == RoleEnum.ADMIN:
        stmt = stmt.where(Chamado.unidade_medsest_id == unidade_id)
    if periodo_inicio is not None:
        stmt = stmt.where(Chamado.dt_abertura >= datetime.combine(periodo_inicio, datetime.min.time(), tzinfo=timezone.utc))
    if periodo_fim is not None:
        stmt = stmt.where(Chamado.dt_abertura <= datetime.combine(periodo_fim, datetime.max.time(), tzinfo=timezone.utc))
    if search:
        termo = f"%{search}%"
        condicoes = [Cliente.razao_social.ilike(termo)]
        if search.strip().isdigit():
            condicoes.append(Chamado.numero_chamado == int(search.strip()))
        stmt = stmt.join(Cliente, Chamado.cliente_id == Cliente.id).where(or_(*condicoes))

    rows, total, pages = await paginate(db, stmt, params)
    return Page[ChamadoListItem](
        items=[_para_item(c) for c in rows],
        total=total, page=params.page, size=params.size, pages=pages,
    )


@router.get("/{chamado_id}", response_model=ChamadoListItem)
async def obter_chamado(
    chamado_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> ChamadoListItem:
    chamado = await _get_visivel_ou_404(chamado_id, usuario, db)
    stmt = (
        select(Chamado)
        .where(Chamado.id == chamado.id)
        .options(
            selectinload(Chamado.cliente),
            selectinload(Chamado.tecnico_externo),
            selectinload(Chamado.tecnico_interno),
        )
    )
    completo = await db.scalar(stmt)
    return _para_item(completo)


@router.post("", response_model=ChamadoRead, status_code=status.HTTP_201_CREATED)
async def criar_chamado(
    body: ChamadoCreate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(_GESTAO),
) -> ChamadoRead:
    cliente = await db.get(Cliente, body.cliente_id)
    if cliente is None:
        raise AppException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Cliente inválido.", "CLIENTE_INVALIDO")

    # A unidade do chamado vem do cliente; se ele não tiver, usa a do usuário.
    unidade_id = cliente.unidade_medsest_id or usuario.unidade_id
    if unidade_id is None:
        raise AppException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Não foi possível determinar a unidade: defina a unidade do cliente.",
            "UNIDADE_INDEFINIDA",
        )

    if usuario.role == RoleEnum.GESTOR_COMERCIAL:
        gestor_id = usuario.id
    else:
        gestor_id = body.gestor_comercial_id or cliente.gestor_comercial_id
    if gestor_id is None:
        raise AppException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Informe o gestor_comercial_id ou defina o gestor comercial do cliente.",
            "GESTOR_INDEFINIDO",
        )
    gestor = await db.get(Usuario, gestor_id)
    if gestor is None or gestor.role != RoleEnum.GESTOR_COMERCIAL:
        raise AppException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "gestor_comercial_id inválido (usuário não é gestor comercial).",
            "GESTOR_INVALIDO",
        )

    await _validar_tecnico(db, body.tecnico_externo_id, RoleEnum.TECNICO_EXTERNO, "tecnico_externo_id")

    # Distribuição automática do técnico interno
    tecnico_interno_id = await get_proximo_tecnico_interno(unidade_id, db)

    chamado = Chamado(
        cliente_id=cliente.id,
        unidade_medsest_id=unidade_id,
        gestor_comercial_id=gestor_id,
        tecnico_externo_id=body.tecnico_externo_id,
        tecnico_interno_id=tecnico_interno_id,
        tipo_visita=body.tipo_visita,
        recomendacoes=body.recomendacoes,
        data_proposta=body.data_proposta,
        status=StatusChamado.PENDENTE,
        dt_abertura=_agora(),
    )
    db.add(chamado)
    await db.flush()

    await notificar_novo_chamado(chamado.id, db)

    await db.refresh(chamado)
    return ChamadoRead.model_validate(chamado)


@router.put("/{chamado_id}", response_model=ChamadoRead)
async def atualizar_chamado(
    chamado_id: uuid.UUID,
    body: ChamadoUpdate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(_GESTAO),
) -> ChamadoRead:
    chamado = await _get_visivel_ou_404(chamado_id, usuario, db)
    dados = body.model_dump(exclude_unset=True)

    if chamado.status in _STATUS_TRAVADOS:
        bloqueados = set(dados) - _CAMPOS_LIVRES_APOS_TRAVA
        if bloqueados:
            raise AppException(
                status.HTTP_409_CONFLICT,
                f"Chamado {chamado.status.value}: só é possível alterar os técnicos responsáveis.",
                "CHAMADO_TRAVADO",
            )

    if "tecnico_externo_id" in dados:
        await _validar_tecnico(db, dados["tecnico_externo_id"], RoleEnum.TECNICO_EXTERNO, "tecnico_externo_id")
    if "tecnico_interno_id" in dados:
        await _validar_tecnico(db, dados["tecnico_interno_id"], RoleEnum.TECNICO_INTERNO, "tecnico_interno_id")

    for campo, valor in dados.items():
        setattr(chamado, campo, valor)

    await db.flush()
    await db.refresh(chamado)
    return ChamadoRead.model_validate(chamado)


@router.put("/{chamado_id}/cancelar", response_model=ChamadoRead)
async def cancelar_chamado(
    chamado_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(_GESTAO),
) -> ChamadoRead:
    chamado = await _get_visivel_ou_404(chamado_id, usuario, db)
    if chamado.status == StatusChamado.CANCELADO:
        raise AppException(status.HTTP_409_CONFLICT, "Chamado já está cancelado.", "JA_CANCELADO")

    chamado.status = StatusChamado.CANCELADO
    await db.flush()
    await db.refresh(chamado)
    return ChamadoRead.model_validate(chamado)


@router.put("/{chamado_id}/reagendar", response_model=ChamadoRead)
async def reagendar_chamado(
    chamado_id: uuid.UUID,
    body: ReagendarRequest,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(require_roles(RoleEnum.TECNICO_EXTERNO)),
) -> ChamadoRead:
    """O técnico externo propõe nova data e o gestor comercial é avisado."""
    chamado = await _get_visivel_ou_404(chamado_id, usuario, db)
    if chamado.status != StatusChamado.PENDENTE:
        raise AppException(
            status.HTTP_409_CONFLICT,
            "Só é possível reagendar um chamado pendente.",
            "REAGENDAMENTO_INVALIDO",
        )

    chamado.data_visita_alterada = body.nova_data
    await db.flush()
    await notificar_reagendamento(chamado.id, body.nova_data, db)

    await db.refresh(chamado)
    return ChamadoRead.model_validate(chamado)
