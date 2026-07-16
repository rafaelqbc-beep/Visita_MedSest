import { api } from '@/services/api'
import type { ChamadoListItem } from '@/types/chamado'
import type {
  Cargo,
  CargoCreate,
  CargoUpdate,
  Foto,
  Geolocalizacao,
  Setor,
  SetorCreate,
  SetorDetalhe,
  SetorUpdate,
} from '@/types/visita'

// --- Chamado ---

export async function iniciarVisita(
  chamadoId: string,
  geo: Geolocalizacao,
): Promise<ChamadoListItem> {
  const { data } = await api.put<ChamadoListItem>(`/chamados/${chamadoId}/iniciar`, geo)
  return data
}

/** Reassinar substitui a anterior: o backend descarta o arquivo antigo. */
export async function assinarCliente(
  chamadoId: string,
  arquivo: File,
  nome: string,
  cpf: string,
): Promise<ChamadoListItem> {
  const form = new FormData()
  form.append('file', arquivo)
  form.append('nome', nome)
  form.append('cpf', cpf)
  const { data } = await api.post<ChamadoListItem>(`/chamados/${chamadoId}/assinatura-cliente`, form)
  return data
}

export async function assinarTecnico(chamadoId: string, arquivo: File): Promise<ChamadoListItem> {
  const form = new FormData()
  form.append('file', arquivo)
  const { data } = await api.post<ChamadoListItem>(`/chamados/${chamadoId}/assinatura-tecnico`, form)
  return data
}

export async function finalizarVisita(
  chamadoId: string,
  geo: Geolocalizacao,
): Promise<ChamadoListItem> {
  const { data } = await api.put<ChamadoListItem>(`/chamados/${chamadoId}/finalizar`, geo)
  return data
}

// --- Setores ---
// O GET traz cargos e fotos aninhados: uma chamada monta a tela inteira.

export async function listarSetores(chamadoId: string): Promise<SetorDetalhe[]> {
  const { data } = await api.get<SetorDetalhe[]>('/setores', { params: { chamado_id: chamadoId } })
  return data
}

export async function criarSetor(body: SetorCreate): Promise<Setor> {
  const { data } = await api.post<Setor>('/setores', body)
  return data
}

export async function atualizarSetor(id: string, body: SetorUpdate): Promise<Setor> {
  const { data } = await api.put<Setor>(`/setores/${id}`, body)
  return data
}

export async function removerSetor(id: string): Promise<void> {
  await api.delete(`/setores/${id}`)
}

// --- Cargos ---

export async function criarCargo(body: CargoCreate): Promise<Cargo> {
  const { data } = await api.post<Cargo>('/cargos', body)
  return data
}

export async function atualizarCargo(id: string, body: CargoUpdate): Promise<Cargo> {
  const { data } = await api.put<Cargo>(`/cargos/${id}`, body)
  return data
}

export async function removerCargo(id: string): Promise<void> {
  await api.delete(`/cargos/${id}`)
}

// --- Fotos ---

export async function enviarFoto(
  setorId: string,
  arquivo: File,
  descricao?: string,
): Promise<Foto> {
  const form = new FormData()
  form.append('setor_id', setorId)
  form.append('file', arquivo)
  if (descricao) form.append('descricao', descricao)
  // Sem Content-Type manual: o browser precisa montar o boundary do multipart.
  const { data } = await api.post<Foto>('/fotos', form)
  return data
}

export async function removerFoto(id: string): Promise<void> {
  await api.delete(`/fotos/${id}`)
}

/** As fotos são servidas fora da API, em /uploads. */
export function urlDaFoto(caminho: string): string {
  return `/uploads/${caminho}`
}
