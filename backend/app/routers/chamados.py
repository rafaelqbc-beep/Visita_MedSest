"""CRUD de Chamados de visita, com round-robin e notificações."""
import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy import Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.middleware.auth import get_current_user, require_roles
from app.models.cargo import Cargo
from app.models.chamado import Chamado
from app.models.cliente import Cliente
from app.models.enums import RoleEnum, StatusChamado, TipoVisitaEnum
from app.models.setor import Setor
from app.models.usuario import Usuario
from app.schemas.chamado import (
    ChamadoCreate,
    ChamadoListItem,
    ChamadoRead,
    ChamadoUpdate,
    FinalizarVisitaRequest,
    IniciarVisitaRequest,
    ReagendarRequest,
)
from app.schemas.common import Page, PageParams, paginate
from app.services.notificacoes import (
    notificar_novo_chamado,
    notificar_reagendamento,
    notificar_recibo_cliente,
    notificar_visita_liberada,
)
from app.services.round_robin import get_proximo_tecnico_interno
from app.services.visita import (
    aplicar_escopo_chamados,
    get_chamado_editavel,
    get_chamado_visivel,
)
from app.utils.exceptions import AppException
from app.utils.file_handler import remover_arquivo, salvar_imagem
from app.utils.validators import formatar_cpf, validar_cpf

router = APIRouter(prefix="/api/chamados", tags=["chamados"])

_GESTAO = require_roles(RoleEnum.ADMIN, RoleEnum.GESTOR_COMERCIAL)

# Depois de finalizado ou cancelado o chamado fica travado; só a troca de
# técnicos continua permitida (o gestor pode remanejar a qualquer momento).
_STATUS_TRAVADOS = (StatusChamado.FINALIZADO, StatusChamado.CANCELADO)
_CAMPOS_LIVRES_APOS_TRAVA = {"tecnico_externo_id", "tecnico_interno_id"}


def _agora() -> datetime:
    return datetime.now(timezone.utc)


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
    stmt = aplicar_escopo_chamados(stmt, usuario)

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
    chamado = await get_chamado_visivel(chamado_id, usuario, db)
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
    chamado = await get_chamado_visivel(chamado_id, usuario, db)
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
    chamado = await get_chamado_visivel(chamado_id, usuario, db)
    if chamado.status == StatusChamado.CANCELADO:
        raise AppException(status.HTTP_409_CONFLICT, "Chamado já está cancelado.", "JA_CANCELADO")

    chamado.status = StatusChamado.CANCELADO
    await db.flush()
    await db.refresh(chamado)
    return ChamadoRead.model_validate(chamado)


@router.put("/{chamado_id}/iniciar", response_model=ChamadoRead)
async def iniciar_visita(
    chamado_id: uuid.UUID,
    body: IniciarVisitaRequest,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(require_roles(RoleEnum.TECNICO_EXTERNO)),
) -> ChamadoRead:
    """Técnico externo inicia a visita no local: grava horário e geolocalização."""
    chamado = await get_chamado_visivel(chamado_id, usuario, db)
    if chamado.status != StatusChamado.PENDENTE:
        raise AppException(
            status.HTTP_409_CONFLICT,
            f"Só é possível iniciar um chamado pendente (status atual: {chamado.status.value}).",
            "INICIO_INVALIDO",
        )

    chamado.status = StatusChamado.EM_ANDAMENTO
    chamado.dt_inicio_visita = _agora()
    # Geolocalização é opcional: o técnico pode ter negado a permissão no
    # navegador, e isso não pode impedir a visita de começar.
    chamado.geoloc_latitude = body.latitude
    chamado.geoloc_longitude = body.longitude

    await db.flush()
    await db.refresh(chamado)
    return ChamadoRead.model_validate(chamado)


@router.post("/{chamado_id}/assinatura-cliente", response_model=ChamadoRead)
async def assinar_cliente(
    chamado_id: uuid.UUID,
    nome: str = Form(..., description="Nome de quem assinou"),
    cpf: str = Form(..., description="CPF de quem assinou"),
    file: UploadFile = File(..., description="Imagem do traço do canvas"),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> ChamadoRead:
    """Cliente assina no tablet ao conferir os dados no local.

    Nome e CPF identificam quem assinou — sem o e-mail de validação, é isso que
    dá rastreabilidade ao aceite.
    """
    chamado = await get_chamado_editavel(chamado_id, usuario, db)

    if not validar_cpf(cpf):
        raise AppException(status.HTTP_422_UNPROCESSABLE_ENTITY, "CPF inválido.", "CPF_INVALIDO")
    if not nome.strip():
        raise AppException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "Informe o nome de quem assinou.", "NOME_OBRIGATORIO"
        )

    caminho, _ = await salvar_imagem(file, subdir="assinaturas")

    # Reassinatura (traço ruim, pessoa errada): o arquivo anterior é descartado.
    anterior = chamado.assinatura_cliente_caminho
    chamado.assinatura_cliente_caminho = caminho
    chamado.assinatura_cliente_nome = nome.strip()
    chamado.assinatura_cliente_cpf = formatar_cpf(cpf)
    chamado.dt_assinatura_cliente = _agora()

    try:
        await db.flush()
    except Exception:
        remover_arquivo(caminho)
        raise
    if anterior and anterior != caminho:
        remover_arquivo(anterior)

    await db.refresh(chamado)
    return ChamadoRead.model_validate(chamado)


@router.post("/{chamado_id}/assinatura-tecnico", response_model=ChamadoRead)
async def assinar_tecnico(
    chamado_id: uuid.UUID,
    file: UploadFile = File(..., description="Imagem do traço do canvas"),
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> ChamadoRead:
    """Técnico externo assina. A identidade vem do usuário logado — basta o traço."""
    chamado = await get_chamado_editavel(chamado_id, usuario, db)

    caminho, _ = await salvar_imagem(file, subdir="assinaturas")

    anterior = chamado.assinatura_tecnico_caminho
    chamado.assinatura_tecnico_caminho = caminho
    chamado.dt_assinatura_tecnico = _agora()

    try:
        await db.flush()
    except Exception:
        remover_arquivo(caminho)
        raise
    if anterior and anterior != caminho:
        remover_arquivo(anterior)

    await db.refresh(chamado)
    return ChamadoRead.model_validate(chamado)


@router.put("/{chamado_id}/finalizar", response_model=ChamadoRead)
async def finalizar_visita(
    chamado_id: uuid.UUID,
    body: FinalizarVisitaRequest,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> ChamadoRead:
    """Encerra a visita e libera os dados para o técnico interno.

    Exige conteúdo mínimo (1 setor com 1 cargo) e as duas assinaturas — é o
    aceite do cliente que substitui o antigo fluxo de validação por e-mail.
    """
    chamado = await get_chamado_editavel(chamado_id, usuario, db)

    qtd_setores = await db.scalar(
        select(func.count()).select_from(Setor).where(Setor.chamado_id == chamado_id)
    )
    if not qtd_setores:
        raise AppException(
            status.HTTP_409_CONFLICT,
            "Registre ao menos um setor antes de finalizar a visita.",
            "SEM_SETORES",
        )

    qtd_cargos = await db.scalar(
        select(func.count())
        .select_from(Cargo)
        .join(Setor, Cargo.setor_id == Setor.id)
        .where(Setor.chamado_id == chamado_id)
    )
    if not qtd_cargos:
        raise AppException(
            status.HTTP_409_CONFLICT,
            "Registre ao menos um cargo antes de finalizar a visita.",
            "SEM_CARGOS",
        )

    if not chamado.assinatura_cliente_caminho:
        raise AppException(
            status.HTTP_409_CONFLICT,
            "Falta a assinatura do cliente.",
            "SEM_ASSINATURA_CLIENTE",
        )
    if not chamado.assinatura_tecnico_caminho:
        raise AppException(
            status.HTTP_409_CONFLICT,
            "Falta a assinatura do técnico.",
            "SEM_ASSINATURA_TECNICO",
        )

    agora = _agora()
    chamado.status = StatusChamado.FINALIZADO
    chamado.dt_fim_visita = agora
    # Assinado no local: a liberação para o técnico interno é imediata.
    chamado.dt_liberado_tecnico_interno = agora
    chamado.geoloc_assinatura_latitude = body.latitude
    chamado.geoloc_assinatura_longitude = body.longitude

    await db.flush()

    await notificar_visita_liberada(chamado.id, db)
    await notificar_recibo_cliente(chamado.id, db)

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
    chamado = await get_chamado_visivel(chamado_id, usuario, db)
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
