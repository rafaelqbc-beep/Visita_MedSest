/** Espelha `backend/app/schemas/dashboard.py`. */
import type { StatusChamado, TipoVisita } from '@/types'

export interface DashboardKPIs {
  total_abertos: number
  visitas_mes_atual: number
  a_vencer_15_dias: number
  tempo_medio_abertura_visita_dias: number | null
  tempo_medio_duracao_visita_horas: number | null
  tempo_medio_finalizacao_exportacao_dias: number | null
}

export interface TipoVisitaKPI {
  tipo_visita: TipoVisita
  quantidade: number
  percentual: number
}

export interface ConversaoNovosClientes {
  total: number
  concluidos: number
  percentual: number
}

export interface StatusQuantidade {
  status: StatusChamado
  quantidade: number
}

export interface VolumeMes {
  mes: string // "2026-07"
  novo_cliente: number
  renovacao: number
  visita_tecnica: number
  total: number
}

export interface TempoPorTecnico {
  tecnico_id: string
  tecnico_nome: string
  total_visitas: number
  media_duracao_horas: number | null
}

export interface TecnicoInternoCarga {
  tecnico_id: string
  tecnico_nome: string
  pendentes_exportacao: number
}

export interface DashboardResponse {
  kpis: DashboardKPIs
  por_tipo_visita: TipoVisitaKPI[]
  conversao_novos_clientes: ConversaoNovosClientes
  chamados_por_status: StatusQuantidade[]
  volume_por_mes: VolumeMes[]
  tempo_medio_por_tecnico: TempoPorTecnico[]
  carga_tecnicos_internos: TecnicoInternoCarga[]
}

export interface FiltrosDashboard {
  unidade_id?: string
  periodo_inicio?: string
  periodo_fim?: string
  tipo_visita?: TipoVisita
}
