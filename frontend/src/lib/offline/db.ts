/** Banco IndexedDB do modo offline.
 *
 *  - `chamados` / `setores`: espelho de leitura (Etapa 1) — reabrir a visita sem sinal.
 *  - `fila`: outbox das operações feitas offline, para sincronizar ao reconectar (Etapa 2/3).
 *  - `fotosPendentes`: o binário das fotos tiradas offline, por id local (upload na Etapa 3).
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { ChamadoListItem } from '@/types/chamado'
import type { SetorDetalhe } from '@/types/visita'
import type { OperacaoFila } from '@/lib/offline/fila'

interface MedSestDB extends DBSchema {
  chamados: { key: string; value: ChamadoListItem }
  setores: { key: string; value: SetorDetalhe[] }
  fila: { key: number; value: OperacaoFila }
  fotosPendentes: { key: string; value: Blob }
}

const NOME = 'medsest-offline'
const VERSAO = 2

let dbPromise: Promise<IDBPDatabase<MedSestDB>> | null = null

export function getDb(): Promise<IDBPDatabase<MedSestDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MedSestDB>(NOME, VERSAO, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('chamados')) db.createObjectStore('chamados')
        if (!db.objectStoreNames.contains('setores')) db.createObjectStore('setores')
        // v2
        if (!db.objectStoreNames.contains('fila')) db.createObjectStore('fila', { autoIncrement: true })
        if (!db.objectStoreNames.contains('fotosPendentes')) db.createObjectStore('fotosPendentes')
      },
    })
  }
  return dbPromise
}
