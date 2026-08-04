/** Fila (outbox) das operações feitas offline — persistidas no IndexedDB para
 *  serem reenviadas ao servidor quando a conexão voltar (sincronização = Etapa 3).
 *
 *  IDs de alvo podem ser LOCAIS (`local-…`) quando o registro também foi criado
 *  offline: a Etapa 3 troca o id local pelo id real do servidor antes de reenviar. */
import { getDb } from '@/lib/offline/db'
import type {
  CargoCreate,
  CargoUpdate,
  SetorCreate,
  SetorUpdate,
} from '@/types/visita'

export type Operacao =
  | { tipo: 'criarSetor'; chamadoId: string; localId: string; body: SetorCreate }
  | { tipo: 'atualizarSetor'; chamadoId: string; alvoId: string; body: SetorUpdate }
  | { tipo: 'removerSetor'; chamadoId: string; alvoId: string }
  | { tipo: 'criarCargo'; chamadoId: string; setorId: string; localId: string; body: CargoCreate }
  | { tipo: 'atualizarCargo'; chamadoId: string; alvoId: string; body: CargoUpdate }
  | { tipo: 'removerCargo'; chamadoId: string; alvoId: string }
  | { tipo: 'criarFoto'; chamadoId: string; setorId: string; localId: string; descricao?: string; nomeOriginal?: string }
  | { tipo: 'removerFoto'; chamadoId: string; alvoId: string }

/** O que fica gravado. `momento` é ISO só para ordenação de leitura humana. */
export type OperacaoFila = Operacao & { momento: string }

export interface ItemFila {
  chave: number
  op: OperacaoFila
}

export async function enfileirar(op: Operacao): Promise<number> {
  const registro: OperacaoFila = { ...op, momento: new Date().toISOString() }
  return (await getDb()).add('fila', registro)
}

export async function listarFila(): Promise<ItemFila[]> {
  const db = await getDb()
  const itens: ItemFila[] = []
  let cursor = await db.transaction('fila').store.openCursor()
  while (cursor) {
    itens.push({ chave: cursor.key as number, op: cursor.value })
    cursor = await cursor.continue()
  }
  return itens
}

export async function removerDaFila(chave: number): Promise<void> {
  await (await getDb()).delete('fila', chave)
}

export async function tamanhoFila(): Promise<number> {
  return (await getDb()).count('fila')
}
