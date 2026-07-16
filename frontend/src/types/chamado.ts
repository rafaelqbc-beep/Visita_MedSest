/** Espelha `backend/app/schemas/chamado.py` e `schemas/common.py`. */
import type { Chamado, StatusChamado, TipoVisita } from '@/types'

/** Item da listagem: já traz os rótulos prontos, sem buscar relação por relação. */
export interface ChamadoListItem extends Chamado {
  cliente_razao_social: string | null
  cliente_cidade: string | null
  tecnico_externo_nome: string | null
  tecnico_interno_nome: string | null
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

export interface FiltrosChamado {
  page?: number
  size?: number
  status?: StatusChamado
  tipo_visita?: TipoVisita
  cliente_id?: string
  tecnico_externo_id?: string
  unidade_id?: string
  periodo_inicio?: string
  periodo_fim?: string
  search?: string
}

export interface ChamadoCreate {
  cliente_id: string
  tipo_visita: TipoVisita
  tecnico_externo_id?: string | null
  recomendacoes?: string | null
  data_proposta?: string | null
  gestor_comercial_id?: string | null
}

/** `tecnico_interno_id` é editável: o gestor pode remanejar mesmo travado. */
export interface ChamadoUpdate {
  tipo_visita?: TipoVisita
  tecnico_externo_id?: string | null
  tecnico_interno_id?: string | null
  recomendacoes?: string | null
  data_proposta?: string | null
}
