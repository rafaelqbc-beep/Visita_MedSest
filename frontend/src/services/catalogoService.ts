import { api } from '@/services/api'
import type { Catalogo } from '@/types/visita'

/** Riscos por categoria e EPIs por região do corpo. Dados estáticos do backend. */
export async function obterCatalogo(): Promise<Catalogo> {
  const { data } = await api.get<Catalogo>('/catalogo')
  return data
}
