/** Banco IndexedDB do modo offline.
 *
 *  Etapa 1 (leitura offline): guarda um "espelho" do que já foi carregado —
 *  o chamado e a árvore de setores — para o técnico reabrir a visita sem sinal.
 *  As stores `fila` e `fotosPendentes` entram na Etapa 2 (captura offline);
 *  já ficam declaradas aqui para não precisar migrar a versão depois.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { ChamadoListItem } from '@/types/chamado'
import type { SetorDetalhe } from '@/types/visita'

interface MedSestDB extends DBSchema {
  /** Chamados já vistos, por id — para reabrir offline. */
  chamados: { key: string; value: ChamadoListItem }
  /** Árvore de setores (com cargos e fotos), por chamado_id. */
  setores: { key: string; value: SetorDetalhe[] }
}

const NOME = 'medsest-offline'
const VERSAO = 1

let dbPromise: Promise<IDBPDatabase<MedSestDB>> | null = null

export function getDb(): Promise<IDBPDatabase<MedSestDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MedSestDB>(NOME, VERSAO, {
      upgrade(db) {
        // Chaves fora de linha (passadas explicitamente no put).
        if (!db.objectStoreNames.contains('chamados')) db.createObjectStore('chamados')
        if (!db.objectStoreNames.contains('setores')) db.createObjectStore('setores')
      },
    })
  }
  return dbPromise
}
