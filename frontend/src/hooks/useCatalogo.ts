import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { obterCatalogo } from '@/services/catalogoService'
import type { Catalogo } from '@/types/visita'

/** O catálogo é estático (vem do código do backend): busca uma vez e nunca revalida. */
export function useCatalogo() {
  return useQuery({
    queryKey: ['catalogo'],
    queryFn: obterCatalogo,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/** Mapa código → rótulo (riscos + EPIs), para traduzir os códigos gravados na leitura. */
export function useRotulosCatalogo(catalogo: Catalogo | undefined) {
  return useMemo(() => {
    const mapa = new Map<string, string>()
    if (catalogo) {
      for (const categoria of catalogo.riscos)
        for (const a of categoria.agentes) mapa.set(a.codigo, a.rotulo)
      for (const grupo of catalogo.epis) for (const i of grupo.itens) mapa.set(i.codigo, i.rotulo)
    }
    return mapa
  }, [catalogo])
}
