/** Espelho de leitura: grava no IndexedDB o que a API devolve e relê quando
 *  está sem sinal. É o que permite reabrir uma visita já carregada offline. */
import axios from 'axios'
import { getDb } from '@/lib/offline/db'
import type { ChamadoListItem } from '@/types/chamado'
import type { SetorDetalhe } from '@/types/visita'

/** Falha de REDE (sem resposta do servidor) — o caso do galpão sem sinal.
 *  Diferente de um erro HTTP (que tem `response`): esse a gente propaga. */
export function estaOffline(err: unknown): boolean {
  return axios.isAxiosError(err) && !err.response
}

export async function salvarChamadoMirror(chamado: ChamadoListItem): Promise<void> {
  try {
    await (await getDb()).put('chamados', chamado, chamado.id)
  } catch {
    // Cache é best-effort: se o IndexedDB falhar, o online segue funcionando.
  }
}

export async function lerChamadoMirror(id: string): Promise<ChamadoListItem | undefined> {
  try {
    return await (await getDb()).get('chamados', id)
  } catch {
    return undefined
  }
}

export async function salvarSetoresMirror(chamadoId: string, setores: SetorDetalhe[]): Promise<void> {
  try {
    await (await getDb()).put('setores', setores, chamadoId)
  } catch {
    /* best-effort */
  }
}

export async function lerSetoresMirror(chamadoId: string): Promise<SetorDetalhe[] | undefined> {
  try {
    return await (await getDb()).get('setores', chamadoId)
  } catch {
    return undefined
  }
}
