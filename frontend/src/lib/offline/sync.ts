/** Sincronização da outbox ao reconectar (Etapa 3).
 *
 *  Reenvia as operações feitas offline na ORDEM em que foram criadas, trocando os
 *  ids locais (`local-…`) pelos ids reais que o servidor devolve. O mapeamento é
 *  persistido, então uma falha no meio não orfana os registros dependentes.
 */
import axios from 'axios'
import { api, mensagemDeErro } from '@/services/api'
import { getDb } from '@/lib/offline/db'
import {
  listarFila,
  removerDaFila,
  tamanhoFila,
  type Operacao,
} from '@/lib/offline/fila'
import { ehLocal, lerFotoPendente, removerFotoPendente } from '@/lib/offline/mirror'
import type { Cargo, Foto, Setor } from '@/types/visita'

export interface ResultadoSync {
  chamadosAfetados: string[]
  enviadas: number
  restantes: number
  erro?: string
}

// --- Mapeamentos id local → id real (persistidos entre tentativas) ---
async function salvarMapeamento(local: string, real: string): Promise<void> {
  await (await getDb()).put('mapeamentos', real, local)
}
async function lerMapeamentos(): Promise<Map<string, string>> {
  const db = await getDb()
  const mapa = new Map<string, string>()
  let cursor = await db.transaction('mapeamentos').store.openCursor()
  while (cursor) {
    mapa.set(cursor.key as string, cursor.value)
    cursor = await cursor.continue()
  }
  return mapa
}
async function limparMapeamentos(): Promise<void> {
  await (await getDb()).clear('mapeamentos')
}

/** Confirma conexão real com o servidor — `navigator.onLine` mente. */
export async function conexaoReal(): Promise<boolean> {
  try {
    await api.get('/health', { timeout: 5000 })
    return true
  } catch {
    return false
  }
}

function ehNaoEncontrado(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 404
}

/** Executa uma operação contra a API, resolvendo ids locais pelo mapa. */
async function executarOp(op: Operacao, mapa: Map<string, string>): Promise<void> {
  const resolver = (id: string) => mapa.get(id) ?? id

  switch (op.tipo) {
    case 'criarSetor': {
      const { data } = await api.post<Setor>('/setores', op.body)
      mapa.set(op.localId, data.id)
      await salvarMapeamento(op.localId, data.id)
      break
    }
    case 'atualizarSetor':
      await api.put(`/setores/${resolver(op.alvoId)}`, op.body)
      break
    case 'removerSetor':
      await api.delete(`/setores/${resolver(op.alvoId)}`)
      break
    case 'criarCargo': {
      const body = { ...op.body, setor_id: resolver(op.setorId) }
      const { data } = await api.post<Cargo>('/cargos', body)
      mapa.set(op.localId, data.id)
      await salvarMapeamento(op.localId, data.id)
      break
    }
    case 'atualizarCargo':
      await api.put(`/cargos/${resolver(op.alvoId)}`, op.body)
      break
    case 'removerCargo':
      await api.delete(`/cargos/${resolver(op.alvoId)}`)
      break
    case 'criarFoto': {
      const blob = await lerFotoPendente(op.localId)
      if (!blob) break // binário sumiu; nada a subir
      const form = new FormData()
      form.append('setor_id', resolver(op.setorId))
      form.append('file', blob, op.nomeOriginal ?? 'foto.jpg')
      if (op.descricao) form.append('descricao', op.descricao)
      const { data } = await api.post<Foto>('/fotos', form)
      mapa.set(op.localId, data.id)
      await salvarMapeamento(op.localId, data.id)
      await removerFotoPendente(op.localId)
      break
    }
    case 'removerFoto': {
      const alvo = resolver(op.alvoId)
      if (ehLocal(alvo)) break // foto local que nunca subiu
      await api.delete(`/fotos/${alvo}`)
      break
    }
  }
}

/** Ids locais criados E removidos offline: nunca precisam ir ao servidor. */
function idsEfemeros(itens: Awaited<ReturnType<typeof listarFila>>): Set<string> {
  const criados = new Set<string>()
  for (const { op } of itens) if ('localId' in op) criados.add(op.localId)
  const efemeros = new Set<string>()
  for (const { op } of itens) {
    if (
      (op.tipo === 'removerSetor' || op.tipo === 'removerCargo' || op.tipo === 'removerFoto') &&
      ehLocal(op.alvoId) &&
      criados.has(op.alvoId)
    ) {
      efemeros.add(op.alvoId)
    }
  }
  return efemeros
}

function refereEfemero(op: Operacao, efemeros: Set<string>): boolean {
  const ids: string[] = []
  if ('localId' in op) ids.push(op.localId)
  if ('alvoId' in op) ids.push(op.alvoId)
  if ('setorId' in op) ids.push(op.setorId)
  return ids.some((id) => efemeros.has(id))
}

let rodando = false

/** Drena a outbox. Para no primeiro erro (mantém a ordem) e tenta de novo depois. */
export async function sincronizar(): Promise<ResultadoSync> {
  if (rodando) return { chamadosAfetados: [], enviadas: 0, restantes: await tamanhoFila() }
  rodando = true
  try {
    const itens = await listarFila()
    if (itens.length === 0) return { chamadosAfetados: [], enviadas: 0, restantes: 0 }

    const efemeros = idsEfemeros(itens)
    const mapa = await lerMapeamentos()
    const chamados = new Set<string>()
    let enviadas = 0
    let erro: string | undefined

    for (const { chave, op } of itens) {
      chamados.add(op.chamadoId)

      // Criado e removido offline: descarta o par sem tocar no servidor.
      if (refereEfemero(op, efemeros)) {
        if (op.tipo === 'criarFoto') await removerFotoPendente(op.localId)
        await removerDaFila(chave)
        continue
      }

      try {
        await executarOp(op, mapa)
        await removerDaFila(chave)
        enviadas++
      } catch (e) {
        // DELETE/PUT de algo que já não existe no servidor: trata como feito.
        if (ehNaoEncontrado(e) && op.tipo.startsWith('remover')) {
          await removerDaFila(chave)
          enviadas++
          continue
        }
        erro = mensagemDeErro(e, 'Falha ao sincronizar.')
        break // preserva a ordem: não pula o que falhou
      }
    }

    const restantes = await tamanhoFila()
    if (restantes === 0) await limparMapeamentos()
    return { chamadosAfetados: [...chamados], enviadas, restantes, erro }
  } finally {
    rodando = false
  }
}
