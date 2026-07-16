import { api } from '@/services/api'
import type {
  ChamadoCreate,
  ChamadoListItem,
  ChamadoUpdate,
  FiltrosChamado,
  Page,
} from '@/types/chamado'
import type { Cliente, Usuario } from '@/types'

/** Campo vazio vira string vazia na query e o backend recusa. */
function limpar<T extends object>(obj: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== '' && v !== null),
  )
}

export async function listarChamados(filtros: FiltrosChamado): Promise<Page<ChamadoListItem>> {
  const { data } = await api.get<Page<ChamadoListItem>>('/chamados', { params: limpar(filtros) })
  return data
}

export async function obterChamado(id: string): Promise<ChamadoListItem> {
  const { data } = await api.get<ChamadoListItem>(`/chamados/${id}`)
  return data
}

export async function criarChamado(body: ChamadoCreate): Promise<ChamadoListItem> {
  const { data } = await api.post<ChamadoListItem>('/chamados', limpar(body))
  return data
}

export async function atualizarChamado(id: string, body: ChamadoUpdate): Promise<ChamadoListItem> {
  // Aqui NÃO se limpa null: `tecnico_externo_id: null` é como se desatribui um
  // técnico. Só o undefined (campo não tocado) é omitido.
  const payload = Object.fromEntries(
    Object.entries(body).filter(([, v]) => v !== undefined),
  )
  const { data } = await api.put<ChamadoListItem>(`/chamados/${id}`, payload)
  return data
}

export async function cancelarChamado(id: string, motivo?: string): Promise<ChamadoListItem> {
  const { data } = await api.put<ChamadoListItem>(`/chamados/${id}/cancelar`, {
    motivo: motivo?.trim() || null,
  })
  return data
}

// --- Apoio aos formulários ---

export async function buscarClientes(termo: string): Promise<Cliente[]> {
  const { data } = await api.get<Page<Cliente>>('/clientes', {
    params: limpar({ search: termo, size: 20, ativo: true }),
  })
  return data.items
}

export async function listarTecnicosExternos(): Promise<Usuario[]> {
  const { data } = await api.get<Page<Usuario>>('/usuarios', {
    params: { role: 'TECNICO_EXTERNO', ativo: true, size: 100 },
  })
  return data.items
}

export async function listarTecnicosInternos(): Promise<Usuario[]> {
  const { data } = await api.get<Page<Usuario>>('/usuarios', {
    params: { role: 'TECNICO_INTERNO', ativo: true, size: 100 },
  })
  return data.items
}
