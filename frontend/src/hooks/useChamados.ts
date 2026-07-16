import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as service from '@/services/chamadoService'
import type { ChamadoCreate, ChamadoUpdate, FiltrosChamado } from '@/types/chamado'

export function useChamados(filtros: FiltrosChamado) {
  return useQuery({
    queryKey: ['chamados', filtros],
    queryFn: () => service.listarChamados(filtros),
    // Trocar de página não pode piscar a tabela inteira.
    placeholderData: keepPreviousData,
  })
}

export function useChamado(id: string | undefined) {
  return useQuery({
    queryKey: ['chamado', id],
    queryFn: () => service.obterChamado(id!),
    enabled: Boolean(id),
  })
}

export function useCriarChamado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ChamadoCreate) => service.criarChamado(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chamados'] }),
  })
}

export function useAtualizarChamado(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ChamadoUpdate) => service.atualizarChamado(id, body),
    onSuccess: (dados) => {
      qc.setQueryData(['chamado', id], dados)
      void qc.invalidateQueries({ queryKey: ['chamados'] })
    },
  })
}

export function useCancelarChamado(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => service.cancelarChamado(id),
    onSuccess: (dados) => {
      qc.setQueryData(['chamado', id], dados)
      void qc.invalidateQueries({ queryKey: ['chamados'] })
      // O dashboard conta chamados por status: cancelar muda os números.
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useTecnicosExternos() {
  return useQuery({
    queryKey: ['tecnicos', 'externos'],
    queryFn: service.listarTecnicosExternos,
    staleTime: 5 * 60 * 1000, // muda pouco
  })
}

export function useTecnicosInternos() {
  return useQuery({
    queryKey: ['tecnicos', 'internos'],
    queryFn: service.listarTecnicosInternos,
    staleTime: 5 * 60 * 1000,
  })
}
