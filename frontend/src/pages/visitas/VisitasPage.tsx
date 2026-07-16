import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  MapPin,
  Play,
} from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { StatusBadge } from '@/components/StatusBadge'
import { TipoVisitaBadge } from '@/components/TipoVisitaBadge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useChamados } from '@/hooks/useChamados'
import { useGeolocalizacao } from '@/hooks/useGeolocalizacao'
import { useIniciarVisita } from '@/hooks/useVisita'
import { data as fmtData } from '@/lib/formato'
import { mensagemDeErro } from '@/services/api'
import type { ChamadoListItem } from '@/types/chamado'

/** Card de uma visita. Tablet-first: texto ≥16px, alvos ≥44px. */
function CardVisita({
  chamado,
  onIniciar,
}: {
  chamado: ChamadoListItem
  onIniciar: (ch: ChamadoListItem) => void
}) {
  const navigate = useNavigate()
  const [verRecomendacoes, setVerRecomendacoes] = useState(false)
  const emAndamento = chamado.status === 'EM_ANDAMENTO'
  const dataPrevista = chamado.data_visita_alterada ?? chamado.data_proposta

  return (
    <article className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-content-secondary">Chamado #{chamado.numero_chamado}</p>
          <h2 className="mt-0.5 text-lg font-semibold tracking-tightish text-content">
            {chamado.cliente_razao_social ?? '—'}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={chamado.status} />
          <TipoVisitaBadge tipo={chamado.tipo_visita} />
        </div>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {chamado.cliente_cidade && (
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-content-secondary" aria-hidden />
            <div>
              <dt className="sr-only">Cidade</dt>
              <dd className="text-base text-content">{chamado.cliente_cidade}</dd>
            </div>
          </div>
        )}
        <div>
          <dt className="text-sm text-content-secondary">Data prevista</dt>
          <dd className="text-base text-content">
            {fmtData(dataPrevista)}
            {chamado.data_visita_alterada && (
              <span className="ml-1 text-sm text-warning">(reagendada)</span>
            )}
          </dd>
        </div>
      </dl>

      {chamado.recomendacoes && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setVerRecomendacoes((v) => !v)}
            aria-expanded={verRecomendacoes}
            className="flex min-h-touch w-full items-center justify-between gap-2 rounded-lg
              bg-accent px-3 py-2 text-left text-sm font-medium text-primary transition-colors
              hover:bg-accent/70 focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-primary"
          >
            Recomendações do gestor
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform ${verRecomendacoes ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
          {verRecomendacoes && (
            <p className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-base text-content">
              {chamado.recomendacoes}
            </p>
          )}
        </div>
      )}

      <div className="mt-5">
        {emAndamento ? (
          <Button className="w-full sm:w-auto" onClick={() => navigate(`/visitas/${chamado.id}`)}>
            <ClipboardCheck className="h-4 w-4" aria-hidden />
            Continuar visita
          </Button>
        ) : (
          // Verde da marca: é o passo que conclui a preparação e põe o técnico
          // em campo.
          <Button variante="action" className="w-full sm:w-auto" onClick={() => onIniciar(chamado)}>
            <Play className="h-4 w-4" aria-hidden />
            Iniciar visita
          </Button>
        )}
      </div>
    </article>
  )
}

export default function VisitasPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { obter, obtendo } = useGeolocalizacao()
  const [confirmando, setConfirmando] = useState<ChamadoListItem | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  // A visita finalizada some da lista (o escopo do técnico não vê FINALIZADO).
  // Sem este aviso, o técnico veria a visita sumir e não saberia se deu certo.
  const finalizou = (location.state as { visitaFinalizada?: boolean } | null)?.visitaFinalizada

  // O escopo do backend já limita ao técnico logado; aqui só tiramos os
  // encerrados, que não são trabalho dele.
  const { data, isLoading, isError, refetch } = useChamados({ page: 1, size: 50 })
  const iniciar = useIniciarVisita(confirmando?.id ?? '')

  const visitas = (data?.items ?? []).filter(
    (ch) => ch.status === 'PENDENTE' || ch.status === 'EM_ANDAMENTO',
  )
  const pendentes = visitas.filter((ch) => ch.status === 'PENDENTE')
  const andamento = visitas.filter((ch) => ch.status === 'EM_ANDAMENTO')

  async function confirmarInicio() {
    if (!confirmando) return
    setErro(null)
    try {
      // A geolocalização é opcional: se falhar, vai {null, null} e a visita
      // começa mesmo assim.
      const geo = await obter()
      await iniciar.mutateAsync(geo)
      const id = confirmando.id
      setConfirmando(null)
      navigate(`/visitas/${id}`)
    } catch (e) {
      setConfirmando(null)
      setErro(mensagemDeErro(e, 'Não foi possível iniciar a visita.'))
    }
  }

  if (isLoading) {
    return (
      <PageWrapper titulo="Minhas visitas">
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-xl border border-border bg-surface" />
          ))}
        </div>
      </PageWrapper>
    )
  }

  if (isError) {
    return (
      <PageWrapper titulo="Minhas visitas">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-12 text-center">
          <AlertCircle className="h-8 w-8 text-error" aria-hidden />
          <p className="font-medium text-content">Não foi possível carregar suas visitas.</p>
          <Button variante="secondary" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper titulo="Minhas visitas" descricao="Visitas atribuídas a você.">
      {finalizou && (
        <div
          role="status"
          className="mb-4 flex items-start gap-2 rounded-lg border border-green-200 bg-success-bg p-4"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
          <div>
            <p className="font-medium text-success">Visita finalizada com sucesso.</p>
            <p className="text-sm text-content-secondary">
              Os dados foram liberados para a equipe técnica e o cliente recebeu a cópia do
              relatório assinado. A visita sai da sua fila.
            </p>
          </div>
        </div>
      )}

      {erro && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-error-bg p-3 text-error"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{erro}</span>
        </div>
      )}

      {visitas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
          <p className="text-lg font-medium text-content">Nenhuma visita na fila.</p>
          <p className="mt-1 text-content-secondary">
            Quando o gestor abrir um chamado para você, ele aparece aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Em andamento primeiro: é o trabalho que já começou. */}
          {andamento.length > 0 && (
            <section aria-label="Visitas em andamento" className="space-y-4">
              <h2 className="text-sm font-medium uppercase tracking-wide text-content-secondary">
                Em andamento
              </h2>
              {andamento.map((ch) => (
                <CardVisita key={ch.id} chamado={ch} onIniciar={setConfirmando} />
              ))}
            </section>
          )}

          {pendentes.length > 0 && (
            <section aria-label="Visitas pendentes" className="space-y-4">
              <h2 className="text-sm font-medium uppercase tracking-wide text-content-secondary">
                A realizar
              </h2>
              {pendentes.map((ch) => (
                <CardVisita key={ch.id} chamado={ch} onIniciar={setConfirmando} />
              ))}
            </section>
          )}
        </div>
      )}

      <ConfirmDialog
        aberto={confirmando !== null}
        titulo="Iniciar a visita agora?"
        descricao={
          `Registra o horário de início e a sua localização em ${confirmando?.cliente_razao_social ?? 'no cliente'}. ` +
          'Se o aparelho não conseguir a localização, a visita começa mesmo assim.'
        }
        rotuloConfirmar="Iniciar visita"
        carregando={obtendo || iniciar.isPending}
        onConfirmar={() => void confirmarInicio()}
        onCancelar={() => setConfirmando(null)}
      />
    </PageWrapper>
  )
}
