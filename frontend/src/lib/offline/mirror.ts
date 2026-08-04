/** Espelho de leitura: grava no IndexedDB o que a API devolve e relê quando
 *  está sem sinal. É o que permite reabrir uma visita já carregada offline. */
import axios from 'axios'
import { getDb } from '@/lib/offline/db'
import type { ChamadoListItem } from '@/types/chamado'
import type { Cargo, Foto, SetorDetalhe } from '@/types/visita'

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

// --- Mutações do espelho (Etapa 2: captura offline) ---

/** Id local para o que foi criado sem sinal. O prefixo `local-` deixa a Etapa 3
 *  reconhecer o que ainda não existe no servidor. */
export function novoLocalId(): string {
  return `local-${crypto.randomUUID()}`
}

export function ehLocal(id: string): boolean {
  return id.startsWith('local-')
}

/** Aplica uma transformação na árvore de setores do chamado e persiste. */
async function editarArvore(
  chamadoId: string,
  fn: (setores: SetorDetalhe[]) => SetorDetalhe[],
): Promise<void> {
  const atual = (await lerSetoresMirror(chamadoId)) ?? []
  await salvarSetoresMirror(chamadoId, fn(atual))
}

export function mirrorAddSetor(chamadoId: string, setor: SetorDetalhe): Promise<void> {
  return editarArvore(chamadoId, (s) => [...s, setor])
}

export function mirrorUpdateSetor(
  chamadoId: string,
  setorId: string,
  campos: Partial<SetorDetalhe>,
): Promise<void> {
  return editarArvore(chamadoId, (s) =>
    s.map((set) => (set.id === setorId ? { ...set, ...campos } : set)),
  )
}

export function mirrorRemoveSetor(chamadoId: string, setorId: string): Promise<void> {
  return editarArvore(chamadoId, (s) => s.filter((set) => set.id !== setorId))
}

export function mirrorAddCargo(chamadoId: string, setorId: string, cargo: Cargo): Promise<void> {
  return editarArvore(chamadoId, (s) =>
    s.map((set) => (set.id === setorId ? { ...set, cargos: [...set.cargos, cargo] } : set)),
  )
}

export function mirrorUpdateCargo(
  chamadoId: string,
  cargoId: string,
  campos: Partial<Cargo>,
): Promise<void> {
  return editarArvore(chamadoId, (s) =>
    s.map((set) => ({
      ...set,
      cargos: set.cargos.map((c) => (c.id === cargoId ? { ...c, ...campos } : c)),
    })),
  )
}

export function mirrorRemoveCargo(chamadoId: string, cargoId: string): Promise<void> {
  return editarArvore(chamadoId, (s) =>
    s.map((set) => ({ ...set, cargos: set.cargos.filter((c) => c.id !== cargoId) })),
  )
}

export function mirrorAddFoto(chamadoId: string, setorId: string, foto: Foto): Promise<void> {
  return editarArvore(chamadoId, (s) =>
    s.map((set) => (set.id === setorId ? { ...set, fotos: [...set.fotos, foto] } : set)),
  )
}

export function mirrorRemoveFoto(chamadoId: string, fotoId: string): Promise<void> {
  return editarArvore(chamadoId, (s) =>
    s.map((set) => ({ ...set, fotos: set.fotos.filter((f) => f.id !== fotoId) })),
  )
}

// --- Fotos pendentes (binário para upload na Etapa 3) ---

export async function salvarFotoPendente(localId: string, arquivo: Blob): Promise<void> {
  try {
    await (await getDb()).put('fotosPendentes', arquivo, localId)
  } catch {
    /* best-effort */
  }
}

export async function removerFotoPendente(localId: string): Promise<void> {
  try {
    await (await getDb()).delete('fotosPendentes', localId)
  } catch {
    /* best-effort */
  }
}
