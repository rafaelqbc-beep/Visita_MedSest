import { api } from '@/services/api'
import {
  ehLocal,
  estaOffline,
  lerSetoresMirror,
  mirrorAddCargo,
  mirrorAddFoto,
  mirrorAddSetor,
  mirrorRemoveCargo,
  mirrorRemoveFoto,
  mirrorRemoveSetor,
  mirrorUpdateCargo,
  mirrorUpdateSetor,
  novoLocalId,
  removerFotoPendente,
  salvarFotoPendente,
  salvarSetoresMirror,
} from '@/lib/offline/mirror'
import { enfileirar } from '@/lib/offline/fila'
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
  try {
    const { data } = await api.get<SetorDetalhe[]>('/setores', { params: { chamado_id: chamadoId } })
    void salvarSetoresMirror(chamadoId, data)
    return data
  } catch (err) {
    if (estaOffline(err)) {
      const cache = await lerSetoresMirror(chamadoId)
      if (cache) return cache
    }
    throw err
  }
}

// Medição: SetorCreate/Update usa number|null; o espelho (SetorDetalhe) guarda
// string|null, como a API serializa o Decimal. Converte na hora de espelhar.
const med = (n?: number | null): string | null => (n == null ? null : String(n))

function arquivoParaDataUrl(arquivo: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result as string)
    fr.onerror = () => reject(fr.error)
    fr.readAsDataURL(arquivo)
  })
}

export async function criarSetor(body: SetorCreate): Promise<Setor> {
  try {
    const { data } = await api.post<Setor>('/setores', body)
    return data
  } catch (err) {
    if (!estaOffline(err)) throw err
    // Sem sinal: cria com id local, espelha e enfileira para sincronizar depois.
    const localId = novoLocalId()
    const setor: SetorDetalhe = {
      id: localId,
      chamado_id: body.chamado_id,
      nome: body.nome,
      descricao_ambiente: body.descricao_ambiente ?? null,
      ordem: body.ordem ?? 0,
      maquinas: body.maquinas ?? null,
      ruido_db: med(body.ruido_db),
      calor_ibutg: med(body.calor_ibutg),
      iluminancia_lux: med(body.iluminancia_lux),
      cargos: [],
      fotos: [],
    }
    await mirrorAddSetor(body.chamado_id, setor)
    await enfileirar({ tipo: 'criarSetor', chamadoId: body.chamado_id, localId, body })
    return setor
  }
}

export async function atualizarSetor(
  chamadoId: string,
  id: string,
  body: SetorUpdate,
): Promise<Setor> {
  try {
    const { data } = await api.put<Setor>(`/setores/${id}`, body)
    return data
  } catch (err) {
    if (!estaOffline(err)) throw err
    const campos: Partial<SetorDetalhe> = {}
    if (body.nome !== undefined) campos.nome = body.nome
    if (body.descricao_ambiente !== undefined) campos.descricao_ambiente = body.descricao_ambiente ?? null
    if (body.ordem !== undefined) campos.ordem = body.ordem
    if (body.maquinas !== undefined) campos.maquinas = body.maquinas ?? null
    if (body.ruido_db !== undefined) campos.ruido_db = med(body.ruido_db)
    if (body.calor_ibutg !== undefined) campos.calor_ibutg = med(body.calor_ibutg)
    if (body.iluminancia_lux !== undefined) campos.iluminancia_lux = med(body.iluminancia_lux)
    await mirrorUpdateSetor(chamadoId, id, campos)
    await enfileirar({ tipo: 'atualizarSetor', chamadoId, alvoId: id, body })
    const setores = await lerSetoresMirror(chamadoId)
    return (setores?.find((s) => s.id === id) ?? { id, chamado_id: chamadoId, ...campos }) as Setor
  }
}

export async function removerSetor(chamadoId: string, id: string): Promise<void> {
  try {
    await api.delete(`/setores/${id}`)
  } catch (err) {
    if (!estaOffline(err)) throw err
    await mirrorRemoveSetor(chamadoId, id)
    await enfileirar({ tipo: 'removerSetor', chamadoId, alvoId: id })
  }
}

// --- Cargos ---

export async function criarCargo(chamadoId: string, body: CargoCreate): Promise<Cargo> {
  try {
    const { data } = await api.post<Cargo>('/cargos', body)
    return data
  } catch (err) {
    if (!estaOffline(err)) throw err
    const localId = novoLocalId()
    const cargo: Cargo = {
      id: localId,
      setor_id: body.setor_id,
      nome_cargo: body.nome_cargo,
      descricao_funcao: body.descricao_funcao ?? null,
      ordem: body.ordem ?? 0,
      num_trabalhadores: body.num_trabalhadores ?? null,
      jornada: body.jornada ?? null,
      possui_riscos: body.possui_riscos ?? null,
      riscos: body.riscos ?? [],
      riscos_outros: body.riscos_outros ?? null,
      utiliza_epis: body.utiliza_epis ?? null,
      epis: body.epis ?? [],
      epis_outros: body.epis_outros ?? null,
    }
    await mirrorAddCargo(chamadoId, body.setor_id, cargo)
    await enfileirar({ tipo: 'criarCargo', chamadoId, setorId: body.setor_id, localId, body })
    return cargo
  }
}

export async function atualizarCargo(
  chamadoId: string,
  id: string,
  body: CargoUpdate,
): Promise<Cargo> {
  try {
    const { data } = await api.put<Cargo>(`/cargos/${id}`, body)
    return data
  } catch (err) {
    if (!estaOffline(err)) throw err
    await mirrorUpdateCargo(chamadoId, id, body as Partial<Cargo>)
    await enfileirar({ tipo: 'atualizarCargo', chamadoId, alvoId: id, body })
    const setores = await lerSetoresMirror(chamadoId)
    const cargo = setores?.flatMap((s) => s.cargos).find((c) => c.id === id)
    return (cargo ?? { id, ...body }) as Cargo
  }
}

export async function removerCargo(chamadoId: string, id: string): Promise<void> {
  try {
    await api.delete(`/cargos/${id}`)
  } catch (err) {
    if (!estaOffline(err)) throw err
    await mirrorRemoveCargo(chamadoId, id)
    await enfileirar({ tipo: 'removerCargo', chamadoId, alvoId: id })
  }
}

// --- Fotos ---

export async function enviarFoto(
  chamadoId: string,
  setorId: string,
  arquivo: File,
  descricao?: string,
): Promise<Foto> {
  const form = new FormData()
  form.append('setor_id', setorId)
  form.append('file', arquivo)
  if (descricao) form.append('descricao', descricao)
  // Sem Content-Type manual: o browser precisa montar o boundary do multipart.
  try {
    const { data } = await api.post<Foto>('/fotos', form)
    return data
  } catch (err) {
    if (!estaOffline(err)) throw err
    // Offline: guarda o binário para upload depois e exibe via data URL (aparece
    // na tela mesmo sem servidor).
    const localId = novoLocalId()
    const dataUrl = await arquivoParaDataUrl(arquivo)
    await salvarFotoPendente(localId, arquivo)
    const foto: Foto = {
      id: localId,
      setor_id: setorId,
      caminho_arquivo: dataUrl,
      nome_original: arquivo.name,
      descricao: descricao ?? null,
      tamanho_bytes: arquivo.size,
      created_at: new Date().toISOString(),
    }
    await mirrorAddFoto(chamadoId, setorId, foto)
    await enfileirar({
      tipo: 'criarFoto',
      chamadoId,
      setorId,
      localId,
      descricao,
      nomeOriginal: arquivo.name,
    })
    return foto
  }
}

export async function removerFoto(chamadoId: string, id: string): Promise<void> {
  try {
    await api.delete(`/fotos/${id}`)
  } catch (err) {
    if (!estaOffline(err)) throw err
    await mirrorRemoveFoto(chamadoId, id)
    if (ehLocal(id)) await removerFotoPendente(id)
    await enfileirar({ tipo: 'removerFoto', chamadoId, alvoId: id })
  }
}

/** Fotos tiradas offline vêm como data URL; as demais são servidas em /uploads. */
export function urlDaFoto(caminho: string): string {
  if (caminho.startsWith('data:') || caminho.startsWith('blob:')) return caminho
  return `/uploads/${caminho}`
}
