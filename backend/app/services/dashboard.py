"""Agregações do dashboard.

Tudo é calculado no banco (COUNT/AVG/date_trunc) — nada de trazer chamados para
somar em Python.

Fuso: os timestamps são gravados em UTC, mas os cortes de mês usam
America/Sao_Paulo. Sem isso, uma visita finalizada às 22h do dia 31 (01h UTC do
dia 1º) cairia no mês seguinte no relatório.
"""
import uuid
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chamado import Chamado
from app.models.enums import RoleEnum, StatusChamado, TipoVisitaEnum
from app.models.usuario import Usuario
from app.schemas.dashboard import (
    ConversaoNovosClientes,
    DashboardKPIs,
    DashboardResponse,
    StatusQuantidade,
    TecnicoInternoCarga,
    TempoPorTecnico,
    TipoVisitaKPI,
    VolumeMes,
)
from app.services.visita import aplicar_escopo_chamados

TZ_BR = ZoneInfo("America/Sao_Paulo")
MESES_NO_GRAFICO = 6


def _mes_local(coluna):
    """Trunca um TIMESTAMPTZ no início do mês, no fuso de São Paulo."""
    return func.date_trunc("month", func.timezone("America/Sao_Paulo", coluna))


def _segundos_entre(fim, inicio):
    return func.extract("epoch", fim - inicio)


def _inicio_mes_atual_utc() -> datetime:
    agora_local = datetime.now(TZ_BR)
    inicio_local = agora_local.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return inicio_local.astimezone(timezone.utc)


def _ultimos_meses(quantidade: int) -> list[str]:
    """Chaves 'YYYY-MM' dos últimos N meses, do mais antigo ao atual."""
    hoje = datetime.now(TZ_BR).date().replace(day=1)
    meses = []
    for i in range(quantidade - 1, -1, -1):
        ano = hoje.year
        mes = hoje.month - i
        while mes <= 0:
            mes += 12
            ano -= 1
        meses.append(f"{ano:04d}-{mes:02d}")
    return meses


class _Filtros:
    """Recorte comum aplicado às análises do dashboard."""

    def __init__(
        self,
        usuario: Usuario,
        unidade_id: uuid.UUID | None,
        periodo_inicio: date | None,
        periodo_fim: date | None,
        tipo_visita: TipoVisitaEnum | None,
    ) -> None:
        self.usuario = usuario
        self.unidade_id = unidade_id
        self.periodo_inicio = periodo_inicio
        self.periodo_fim = periodo_fim
        self.tipo_visita = tipo_visita

    def base(self, stmt: Select, com_periodo: bool = True, com_tipo: bool = True) -> Select:
        """`com_tipo=False` para as análises que comparam os tipos entre si —
        aplicar o filtro nelas as tornaria contraditórias (a pizza viraria uma
        fatia só; a conversão de Novos Clientes zeraria ao filtrar Renovação)."""
        stmt = aplicar_escopo_chamados(stmt, self.usuario)
        if self.unidade_id is not None and self.usuario.role == RoleEnum.ADMIN:
            stmt = stmt.where(Chamado.unidade_medsest_id == self.unidade_id)
        if com_tipo and self.tipo_visita is not None:
            stmt = stmt.where(Chamado.tipo_visita == self.tipo_visita)
        if com_periodo and self.periodo_inicio is not None:
            stmt = stmt.where(
                Chamado.dt_abertura
                >= datetime.combine(self.periodo_inicio, datetime.min.time(), tzinfo=timezone.utc)
            )
        if com_periodo and self.periodo_fim is not None:
            stmt = stmt.where(
                Chamado.dt_abertura
                <= datetime.combine(self.periodo_fim, datetime.max.time(), tzinfo=timezone.utc)
            )
        return stmt


async def _kpis(db: AsyncSession, f: _Filtros) -> DashboardKPIs:
    # --- Indicadores operacionais: retratam "agora", sem o filtro de período ---
    total_abertos = await db.scalar(
        f.base(
            select(func.count()).select_from(Chamado).where(
                Chamado.status.in_([StatusChamado.PENDENTE, StatusChamado.EM_ANDAMENTO])
            ),
            com_periodo=False,
        )
    )

    visitas_mes = await db.scalar(
        f.base(
            select(func.count()).select_from(Chamado).where(
                Chamado.status == StatusChamado.FINALIZADO,
                Chamado.dt_fim_visita >= _inicio_mes_atual_utc(),
            ),
            com_periodo=False,
        )
    )

    hoje = datetime.now(TZ_BR).date()
    # A data que vale é a alterada pelo técnico, se houver reagendamento.
    data_prevista = func.coalesce(Chamado.data_visita_alterada, Chamado.data_proposta)
    a_vencer = await db.scalar(
        f.base(
            select(func.count()).select_from(Chamado).where(
                Chamado.status == StatusChamado.PENDENTE,
                data_prevista.is_not(None),
                data_prevista >= hoje,
                data_prevista <= hoje + timedelta(days=15),
            ),
            com_periodo=False,
        )
    )

    # --- Tempos médios: respeitam o período ---
    media_abertura_visita = await db.scalar(
        f.base(
            select(func.avg(_segundos_entre(Chamado.dt_inicio_visita, Chamado.dt_abertura) / 86400.0))
            .select_from(Chamado)
            .where(Chamado.dt_inicio_visita.is_not(None), Chamado.dt_abertura.is_not(None))
        )
    )
    media_duracao = await db.scalar(
        f.base(
            select(func.avg(_segundos_entre(Chamado.dt_fim_visita, Chamado.dt_inicio_visita) / 3600.0))
            .select_from(Chamado)
            .where(Chamado.dt_fim_visita.is_not(None), Chamado.dt_inicio_visita.is_not(None))
        )
    )
    media_exportacao = await db.scalar(
        f.base(
            select(func.avg(_segundos_entre(Chamado.dt_exportacao_word, Chamado.dt_fim_visita) / 86400.0))
            .select_from(Chamado)
            .where(Chamado.dt_exportacao_word.is_not(None), Chamado.dt_fim_visita.is_not(None))
        )
    )

    def arredondar(valor) -> float | None:
        return round(float(valor), 2) if valor is not None else None

    return DashboardKPIs(
        total_abertos=total_abertos or 0,
        visitas_mes_atual=visitas_mes or 0,
        a_vencer_15_dias=a_vencer or 0,
        tempo_medio_abertura_visita_dias=arredondar(media_abertura_visita),
        tempo_medio_duracao_visita_horas=arredondar(media_duracao),
        tempo_medio_finalizacao_exportacao_dias=arredondar(media_exportacao),
    )


async def _por_tipo_visita(db: AsyncSession, f: _Filtros) -> list[TipoVisitaKPI]:
    """Distribuição entre os tipos — ignora o filtro de tipo (ver `base`)."""
    linhas = (
        await db.execute(
            f.base(
                select(Chamado.tipo_visita, func.count().label("qtd")).select_from(Chamado),
                com_tipo=False,
            )
            .group_by(Chamado.tipo_visita)
        )
    ).all()
    contagem = {linha[0]: linha[1] for linha in linhas}
    total = sum(contagem.values())

    # Todos os tipos aparecem, mesmo zerados: o gráfico não deve "perder" uma
    # fatia só porque não houve nenhuma naquele período.
    return [
        TipoVisitaKPI(
            tipo_visita=tipo,
            quantidade=contagem.get(tipo, 0),
            percentual=round(contagem.get(tipo, 0) * 100 / total, 2) if total else 0.0,
        )
        for tipo in TipoVisitaEnum
    ]


async def _conversao_novos_clientes(db: AsyncSession, f: _Filtros) -> ConversaoNovosClientes:
    """É sobre Novo Cliente por definição — ignora o filtro de tipo (ver `base`)."""
    total = await db.scalar(
        f.base(
            select(func.count()).select_from(Chamado).where(
                Chamado.tipo_visita == TipoVisitaEnum.NOVO_CLIENTE
            ),
            com_tipo=False,
        )
    ) or 0
    concluidos = await db.scalar(
        f.base(
            select(func.count()).select_from(Chamado).where(
                Chamado.tipo_visita == TipoVisitaEnum.NOVO_CLIENTE,
                Chamado.status == StatusChamado.FINALIZADO,
            ),
            com_tipo=False,
        )
    ) or 0
    return ConversaoNovosClientes(
        total=total,
        concluidos=concluidos,
        percentual=round(concluidos * 100 / total, 2) if total else 0.0,
    )


async def _por_status(db: AsyncSession, f: _Filtros) -> list[StatusQuantidade]:
    linhas = (
        await db.execute(
            f.base(select(Chamado.status, func.count().label("qtd")).select_from(Chamado))
            .group_by(Chamado.status)
        )
    ).all()
    contagem = {linha[0]: linha[1] for linha in linhas}
    return [
        StatusQuantidade(status=s, quantidade=contagem.get(s, 0)) for s in StatusChamado
    ]


async def _volume_por_mes(db: AsyncSession, f: _Filtros) -> list[VolumeMes]:
    """Visitas concluídas por mês nos últimos 6, empilhadas por tipo."""
    meses = _ultimos_meses(MESES_NO_GRAFICO)
    primeiro = datetime.strptime(meses[0], "%Y-%m").replace(tzinfo=TZ_BR)

    mes_col = _mes_local(Chamado.dt_fim_visita).label("mes")
    linhas = (
        await db.execute(
            f.base(
                select(mes_col, Chamado.tipo_visita, func.count().label("qtd"))
                .select_from(Chamado)
                .where(
                    Chamado.dt_fim_visita.is_not(None),
                    Chamado.dt_fim_visita >= primeiro.astimezone(timezone.utc),
                ),
                com_periodo=False,  # a janela aqui é sempre os últimos 6 meses
            ).group_by(mes_col, Chamado.tipo_visita)
        )
    ).all()

    campo_por_tipo = {
        TipoVisitaEnum.NOVO_CLIENTE: "novo_cliente",
        TipoVisitaEnum.RENOVACAO: "renovacao",
        TipoVisitaEnum.VISITA_TECNICA: "visita_tecnica",
    }
    # Meses sem visita entram zerados: o gráfico precisa da série contínua.
    acumulado: dict[str, dict[str, int]] = {
        m: {"novo_cliente": 0, "renovacao": 0, "visita_tecnica": 0} for m in meses
    }
    for mes_dt, tipo, qtd in linhas:
        chave = mes_dt.strftime("%Y-%m")
        if chave in acumulado:
            acumulado[chave][campo_por_tipo[tipo]] += qtd

    return [
        VolumeMes(mes=m, **acumulado[m], total=sum(acumulado[m].values())) for m in meses
    ]


async def _tempo_por_tecnico(db: AsyncSession, f: _Filtros) -> list[TempoPorTecnico]:
    media_horas = func.avg(_segundos_entre(Chamado.dt_fim_visita, Chamado.dt_inicio_visita) / 3600.0)
    linhas = (
        await db.execute(
            f.base(
                select(
                    Usuario.id,
                    Usuario.nome,
                    func.count().label("total"),
                    media_horas.label("media"),
                )
                .select_from(Chamado)
                .join(Usuario, Chamado.tecnico_externo_id == Usuario.id)
                .where(
                    Chamado.dt_fim_visita.is_not(None),
                    Chamado.dt_inicio_visita.is_not(None),
                )
            )
            .group_by(Usuario.id, Usuario.nome)
            .order_by(func.count().desc())
        )
    ).all()
    return [
        TempoPorTecnico(
            tecnico_id=linha[0],
            tecnico_nome=linha[1],
            total_visitas=linha[2],
            media_duracao_horas=round(float(linha[3]), 2) if linha[3] is not None else None,
        )
        for linha in linhas
    ]


async def _carga_tecnicos_internos(db: AsyncSession, f: _Filtros) -> list[TecnicoInternoCarga]:
    """PGRs finalizados que cada técnico interno ainda não exportou."""
    linhas = (
        await db.execute(
            f.base(
                select(Usuario.id, Usuario.nome, func.count().label("pendentes"))
                .select_from(Chamado)
                .join(Usuario, Chamado.tecnico_interno_id == Usuario.id)
                .where(
                    Chamado.status == StatusChamado.FINALIZADO,
                    Chamado.dt_exportacao_word.is_(None),
                ),
                com_periodo=False,  # carga é uma foto do agora
            )
            .group_by(Usuario.id, Usuario.nome)
            .order_by(func.count().desc())
        )
    ).all()
    return [
        TecnicoInternoCarga(tecnico_id=l[0], tecnico_nome=l[1], pendentes_exportacao=l[2])
        for l in linhas
    ]


async def montar_dashboard(
    db: AsyncSession,
    usuario: Usuario,
    unidade_id: uuid.UUID | None = None,
    periodo_inicio: date | None = None,
    periodo_fim: date | None = None,
    tipo_visita: TipoVisitaEnum | None = None,
) -> DashboardResponse:
    f = _Filtros(usuario, unidade_id, periodo_inicio, periodo_fim, tipo_visita)
    return DashboardResponse(
        kpis=await _kpis(db, f),
        por_tipo_visita=await _por_tipo_visita(db, f),
        conversao_novos_clientes=await _conversao_novos_clientes(db, f),
        chamados_por_status=await _por_status(db, f),
        volume_por_mes=await _volume_por_mes(db, f),
        tempo_medio_por_tecnico=await _tempo_por_tecnico(db, f),
        carga_tecnicos_internos=await _carga_tecnicos_internos(db, f),
    )
