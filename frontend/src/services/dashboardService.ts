import { api } from '@/services/api'
import type { DashboardResponse, FiltrosDashboard } from '@/types/dashboard'

export async function obterDashboard(filtros: FiltrosDashboard): Promise<DashboardResponse> {
  // Campos vazios viram string vazia na query e o backend recusa: só manda o
  // que foi realmente preenchido.
  const params = Object.fromEntries(
    Object.entries(filtros).filter(([, valor]) => valor !== undefined && valor !== ''),
  )
  const { data } = await api.get<DashboardResponse>('/dashboard', { params })
  return data
}
