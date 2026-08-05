import { useSearchParams, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Printer } from 'lucide-react'
import { DashboardConteudo, num } from '@/components/dashboard/DashboardConteudo'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useDashboard } from '@/hooks/useDashboard'
import { ROTULO_TIPO_VISITA } from '@/lib/coresGrafico'
import type { FiltrosDashboard as Filtros, DashboardResponse } from '@/types/dashboard'
import type { TipoVisita } from '@/types'

function dataBr(iso: string): string {
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

/** Parágrafo com os destaques do período, para abrir a discussão com a equipe. */
function resumo(data: DashboardResponse, periodoTxt: string): string {
  const visitas = data.tempo_medio_por_tecnico.reduce((s, t) => s + t.total_visitas, 0)
  const nTec = data.tempo_medio_por_tecnico.length
  const conv = data.conversao_novos_clientes
  const kp = data.kpis
  const partes: string[] = []

  partes.push(
    `${periodoTxt}, foram concluídas ${visitas} ${visitas === 1 ? 'visita' : 'visitas'}` +
      (nTec > 0 ? ` por ${nTec} ${nTec === 1 ? 'técnico externo' : 'técnicos externos'}.` : '.'),
  )
  if (conv.total > 0) {
    partes.push(
      `A conversão de novos clientes foi de ${conv.percentual.toFixed(0)}% ` +
        `(${conv.concluidos} de ${conv.total} chamados abertos como Novo Cliente).`,
    )
  }
  const medias: string[] = []
  if (kp.tempo_medio_duracao_visita_horas != null)
    medias.push(`duração média da visita de ${num(kp.tempo_medio_duracao_visita_horas, 1)} h`)
  if (kp.tempo_medio_abertura_visita_dias != null)
    medias.push(`${num(kp.tempo_medio_abertura_visita_dias, 1)} dias da abertura até a visita`)
  if (kp.tempo_medio_finalizacao_exportacao_dias != null)
    medias.push(`${num(kp.tempo_medio_finalizacao_exportacao_dias, 1)} dias da visita até a exportação do PGR`)
  if (medias.length) partes.push(`Tempos médios: ${medias.join('; ')}.`)

  const predominante = [...data.por_tipo_visita].sort((a, b) => b.quantidade - a.quantidade)[0]
  if (predominante && predominante.quantidade > 0) {
    partes.push(
      `O tipo de visita predominante foi ${ROTULO_TIPO_VISITA[predominante.tipo_visita]} ` +
        `(${predominante.percentual.toFixed(0)}% do total).`,
    )
  }
  const pendentes = data.carga_tecnicos_internos.reduce((s, t) => s + t.pendentes_exportacao, 0)
  if (pendentes > 0) {
    partes.push(`Há ${pendentes} ${pendentes === 1 ? 'PGR pendente' : 'PGRs pendentes'} de exportação.`)
  }
  return partes.join(' ')
}

export default function RelatorioGerencialPage() {
  const [sp] = useSearchParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()

  const filtros: Filtros = {
    periodo_inicio: sp.get('periodo_inicio') ?? undefined,
    periodo_fim: sp.get('periodo_fim') ?? undefined,
    tipo_visita: (sp.get('tipo_visita') as TipoVisita | null) ?? undefined,
    unidade_id: sp.get('unidade_id') ?? undefined,
  }
  const { data, isLoading, isError } = useDashboard(filtros)

  const periodoTxt =
    filtros.periodo_inicio || filtros.periodo_fim
      ? `Período de ${filtros.periodo_inicio ? dataBr(filtros.periodo_inicio) : 'início'} a ${filtros.periodo_fim ? dataBr(filtros.periodo_fim) : 'hoje'}`
      : 'Considerando todo o histórico'
  const escopo = usuario?.role === 'ADMIN' ? 'Todas as unidades' : 'Sua unidade de atuação'
  const geradoEm = new Date().toLocaleString('pt-BR')

  return (
    <main className="min-h-screen bg-white">
      {/* Barra de ações — não sai na impressão */}
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex min-h-touch items-center gap-1.5 font-medium text-primary underline-offset-2 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Voltar ao dashboard
        </button>
        <Button variante="action" onClick={() => window.print()} disabled={!data}>
          <Printer className="h-4 w-4" aria-hidden />
          Imprimir / Salvar como PDF
        </Button>
      </div>

      <div className="relatorio-print mx-auto max-w-5xl px-4 py-6 sm:px-8">
        {/* Cabeçalho do relatório */}
        <header className="mb-6 border-b border-border pb-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">MedSest Visita</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tightish text-content">Relatório Gerencial</h1>
          <div className="mt-2 space-y-0.5 text-sm text-content-secondary">
            <p>{periodoTxt}.</p>
            <p>
              Escopo: {escopo}
              {filtros.tipo_visita && ` · Tipo: ${ROTULO_TIPO_VISITA[filtros.tipo_visita]}`}
            </p>
            <p>Gerado em {geradoEm}{usuario?.nome ? ` por ${usuario.nome}` : ''}.</p>
          </div>
        </header>

        {isLoading ? (
          <div className="h-64 animate-pulse rounded-xl border border-border bg-surface" />
        ) : isError || !data ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-12 text-center">
            <AlertCircle className="h-8 w-8 text-error" aria-hidden />
            <p className="font-medium text-content">Não foi possível carregar os dados.</p>
          </div>
        ) : (
          <>
            {/* Resumo automático */}
            <section className="mb-6 rounded-xl border border-border bg-accent/30 p-4">
              <h2 className="mb-1 font-semibold tracking-tightish text-content">Resumo do período</h2>
              <p className="text-sm leading-relaxed text-content">{resumo(data, periodoTxt)}</p>
            </section>

            <DashboardConteudo data={data} variante="relatorio" />

            <p className="mt-8 border-t border-border pt-3 text-xs text-content-secondary">
              Relatório gerado automaticamente pelo MedSest Visita a partir dos dados do dashboard.
              Os indicadores "agora" (chamados abertos, visitas no mês, a vencer) refletem a situação
              atual e não usam o filtro de período; as análises e médias respeitam o período informado.
            </p>
          </>
        )}
      </div>
    </main>
  )
}
