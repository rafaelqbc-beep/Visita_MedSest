import { api } from '@/services/api'
import type { Cliente, Usuario, UnidadeMedsest } from '@/types'
import type { Page } from '@/types/chamado'
import type {
  ClienteCreate,
  ClienteUpdate,
  FiltrosCliente,
  FiltrosUnidade,
  FiltrosUsuario,
  UnidadeCreate,
  UnidadeUpdate,
  UsuarioCreate,
  UsuarioUpdate,
} from '@/types/cadastros'

/** Remove só `undefined` (campo não enviado); preserva `null` (limpar um valor)
 *  e string vazia — os formulários já convertem '' → null antes de enviar. */
function montar<T extends object>(obj: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}

/** Vazio na query quebra o backend; aqui tira undefined/''/null. */
function limparFiltros<T extends object>(obj: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== '' && v !== null),
  )
}

// --- Clientes ---
export async function listarClientes(filtros: FiltrosCliente): Promise<Page<Cliente>> {
  const { data } = await api.get<Page<Cliente>>('/clientes', { params: limparFiltros(filtros) })
  return data
}
export async function obterCliente(id: string): Promise<Cliente> {
  const { data } = await api.get<Cliente>(`/clientes/${id}`)
  return data
}
export async function criarCliente(body: ClienteCreate): Promise<Cliente> {
  const { data } = await api.post<Cliente>('/clientes', montar(body))
  return data
}
export async function atualizarCliente(id: string, body: ClienteUpdate): Promise<Cliente> {
  const { data } = await api.put<Cliente>(`/clientes/${id}`, montar(body))
  return data
}

// --- Usuários ---
export async function listarUsuarios(filtros: FiltrosUsuario): Promise<Page<Usuario>> {
  const { data } = await api.get<Page<Usuario>>('/usuarios', { params: limparFiltros(filtros) })
  return data
}
export async function obterUsuario(id: string): Promise<Usuario> {
  const { data } = await api.get<Usuario>(`/usuarios/${id}`)
  return data
}
export async function criarUsuario(body: UsuarioCreate): Promise<Usuario> {
  const { data } = await api.post<Usuario>('/usuarios', montar(body))
  return data
}
export async function atualizarUsuario(id: string, body: UsuarioUpdate): Promise<Usuario> {
  const { data } = await api.put<Usuario>(`/usuarios/${id}`, montar(body))
  return data
}

// --- Unidades ---
export async function listarUnidades(filtros: FiltrosUnidade): Promise<Page<UnidadeMedsest>> {
  const { data } = await api.get<Page<UnidadeMedsest>>('/unidades', { params: limparFiltros(filtros) })
  return data
}
export async function obterUnidade(id: string): Promise<UnidadeMedsest> {
  const { data } = await api.get<UnidadeMedsest>(`/unidades/${id}`)
  return data
}
export async function criarUnidade(body: UnidadeCreate): Promise<UnidadeMedsest> {
  const { data } = await api.post<UnidadeMedsest>('/unidades', montar(body))
  return data
}
export async function atualizarUnidade(id: string, body: UnidadeUpdate): Promise<UnidadeMedsest> {
  const { data } = await api.put<UnidadeMedsest>(`/unidades/${id}`, montar(body))
  return data
}

// --- Listas de apoio (para os selects dos formulários) ---
export async function listarUnidadesAtivas(): Promise<UnidadeMedsest[]> {
  const { data } = await api.get<Page<UnidadeMedsest>>('/unidades', {
    params: { ativo: true, size: 100 },
  })
  return data.items
}
export async function listarGestores(): Promise<Usuario[]> {
  const { data } = await api.get<Page<Usuario>>('/usuarios', {
    params: { role: 'GESTOR_COMERCIAL', ativo: true, size: 100 },
  })
  return data.items
}
