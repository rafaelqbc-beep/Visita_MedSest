import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { obterDashboard } from '@/services/dashboardService'
import type { FiltrosDashboard } from '@/types/dashboard'

export function useDashboard(filtros: FiltrosDashboard) {
  return useQuery({
    queryKey: ['dashboard', filtros],
    queryFn: () => obterDashboard(filtros),
    // Ao trocar um filtro, segura o render anterior em vez de piscar skeleton
    // e derrubar o layout.
    placeholderData: keepPreviousData,
  })
}
