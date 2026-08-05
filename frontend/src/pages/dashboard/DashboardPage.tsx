import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, FileText } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { DashboardConteudo } from '@/components/dashboard/DashboardConteudo'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useDashboard } from '@/hooks/useDashboard'
import { cn } from '@/lib/utils'
import { FiltrosDashboard } from '@/pages/dashboard/FiltrosDashboard'
import type { FiltrosDashboard as Filtros } from '@/types/dashboard'

/** Filtros ativos → query string, para o relatório abrir com o mesmo recorte. */
function paraQuery(filtros: Filtros): string {
  const p = new URLSearchParams()
  if (filtros.periodo_inicio) p.set('periodo_inicio', filtros.periodo_inicio)
  if (filtros.periodo_fim) p.set('periodo_fim', filtros.periodo_fim)
  if (filtros.tipo_visita) p.set('tipo_visita', filtros.tipo_visita)
  if (filtros.unidade_id) p.set('unidade_id', filtros.unidade_id)
  const s = p.toString()
  return s ? `?${s}` : ''
}

export default function DashboardPage() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [filtros, setFiltros] = useState<Filtros>({})
  const { data, isLoading, isError, isFetching, refetch } = useDashboard(filtros)

  if (isLoading) {
    return (
      <PageWrapper titulo="Dashboard">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-surface" />
          ))}
        </div>
      </PageWrapper>
    )
  }

  if (isError || !data) {
    return (
      <PageWrapper titulo="Dashboard">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-12 text-center">
          <AlertCircle className="h-8 w-8 text-error" aria-hidden />
          <p className="font-medium text-content">Não foi possível carregar o dashboard.</p>
          <button
            onClick={() => void refetch()}
            className="text-sm font-medium text-primary underline underline-offset-2"
          >
            Tentar novamente
          </button>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper
      titulo="Dashboard"
      descricao={usuario?.role === 'ADMIN' ? 'Todas as unidades.' : 'Dados do seu escopo de atuação.'}
      acoes={
        <Button variante="secondary" onClick={() => navigate(`/dashboard/relatorio${paraQuery(filtros)}`)}>
          <FileText className="h-4 w-4" aria-hidden />
          Gerar relatório
        </Button>
      }
    >
      <FiltrosDashboard filtros={filtros} onChange={setFiltros} />

      {/* Segura o render anterior durante o refetch em vez de piscar skeleton */}
      <DashboardConteudo data={data} variante="tela" className={cn('transition-opacity', isFetching && 'opacity-60')} />
    </PageWrapper>
  )
}
