"""Schemas Pydantic do dashboard.

Sobre o filtro de período: `periodo_inicio`/`periodo_fim` recortam as análises
(tempos médios, distribuição por tipo, conversão, gráficos), aplicados sobre
`dt_abertura`. Os indicadores operacionais — abertos, visitas do mês e a vencer
— são de "agora" e ignoram o período de propósito.
"""
import uuid

from pydantic import BaseModel

from app.models.enums import StatusChamado, TipoVisitaEnum


class DashboardKPIs(BaseModel):
    total_abertos: int
    """Chamados PENDENTE + EM_ANDAMENTO (não usa o filtro de período)."""

    visitas_mes_atual: int
    """Visitas concluídas no mês corrente, por `dt_fim_visita` (não usa o período)."""

    a_vencer_15_dias: int
    """Chamados ainda PENDENTE com data prevista nos próximos 15 dias."""

    tempo_medio_abertura_visita_dias: float | None
    """Da abertura do chamado até o início da visita."""

    tempo_medio_duracao_visita_horas: float | None
    """Do início ao fim da visita."""

    tempo_medio_finalizacao_exportacao_dias: float | None
    """Do fim da visita até o técnico interno exportar o Word."""


class TipoVisitaKPI(BaseModel):
    tipo_visita: TipoVisitaEnum
    quantidade: int
    percentual: float


class ConversaoNovosClientes(BaseModel):
    """Dos chamados abertos como Novo Cliente no período, quantos viraram
    visita concluída."""

    total: int
    concluidos: int
    percentual: float


class StatusQuantidade(BaseModel):
    status: StatusChamado
    quantidade: int


class VolumeMes(BaseModel):
    """Visitas concluídas no mês (por `dt_fim_visita`), quebradas por tipo."""

    mes: str  # "2026-07"
    novo_cliente: int
    renovacao: int
    visita_tecnica: int
    total: int


class TempoPorTecnico(BaseModel):
    tecnico_id: uuid.UUID
    tecnico_nome: str
    total_visitas: int
    media_duracao_horas: float | None


class TecnicoInternoCarga(BaseModel):
    """Quantos PGRs o técnico interno tem pendentes de exportação."""

    tecnico_id: uuid.UUID
    tecnico_nome: str
    pendentes_exportacao: int


class DashboardResponse(BaseModel):
    kpis: DashboardKPIs
    por_tipo_visita: list[TipoVisitaKPI]
    conversao_novos_clientes: ConversaoNovosClientes
    chamados_por_status: list[StatusQuantidade]
    volume_por_mes: list[VolumeMes]
    tempo_medio_por_tecnico: list[TempoPorTecnico]
    carga_tecnicos_internos: list[TecnicoInternoCarga]
