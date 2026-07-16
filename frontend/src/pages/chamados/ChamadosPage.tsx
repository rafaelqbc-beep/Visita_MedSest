import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, Filter, Plus, Search, X } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { StatusBadge } from '@/components/StatusBadge'
import { TipoVisitaBadge } from '@/components/TipoVisitaBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Paginacao } from '@/components/ui/Paginacao'
import { Select } from '@/components/ui/Select'
import { useChamados, useTecnicosExternos } from '@/hooks/useChamados'
import { ROTULO_STATUS, ROTULO_TIPO_VISITA } from '@/lib/coresGrafico'
import { data as fmtData } from '@/lib/formato'
import { cn } from '@/lib/utils'
import type { StatusChamado, TipoVisita } from '@/types'
import type { FiltrosChamado } from '@/types/chamado'

const STATUS: StatusChamado[] = ['PENDENTE', 'EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO']
const TIPOS: TipoVisita[] = ['NOVO_CLIENTE', 'RENOVACAO', 'VISITA_TECNICA']

export default function ChamadosPage() {
  const navigate = useNavigate()
  const [filtros, setFiltros] = useState<FiltrosChamado>({ page: 1, size: 20 })
  const [busca, setBusca] = useState('')

  // Espera parar de digitar antes de consultar.
  useEffect(() => {
    const t = setTimeout(() => {
      setFiltros((f) => ({ ...f, search: busca || undefined, page: 1 }))
    }, 350)
    return () => clearTimeout(t)
  }, [busca])

  const { data, isLoading, isError, isFetching, refetch } = useChamados(filtros)
  const { data: tecnicos = [] } = useTecnicosExternos()

  function mudarFiltro(parcial: Partial<FiltrosChamado>) {
    // Qualquer filtro novo volta para a página 1: senão o usuário fica numa
    // página que não existe mais no resultado filtrado.
    setFiltros((f) => ({ ...f, ...parcial, page: 1 }))
  }

  const temFiltro = Boolean(
    filtros.status || filtros.tipo_visita || filtros.tecnico_externo_id || busca,
  )

  return (
    <PageWrapper
      titulo="Chamados"
      descricao="Abertura e acompanhamento das visitas técnicas."
      acoes={
        <Link to="/chamados/novo">
          <Button>
            <Plus className="h-4 w-4" aria-hidden />
            Novo chamado
          </Button>
        </Link>
      }
    >
      {/* Uma linha de filtros acima de tudo que ela recorta */}
      <div className="mb-4 rounded-xl border border-border bg-surface p-3 shadow-card">
        <div className="flex flex-wrap items-end gap-3">
          <span className="flex h-10 items-center gap-1.5 text-sm font-medium text-content-label">
            <Filter className="h-4 w-4" aria-hidden />
            Filtros
          </span>

          <div className="min-w-[220px] flex-1">
            <label htmlFor="busca" className="mb-1 block text-xs text-content-secondary">
              Buscar
            </label>
            <Input
              id="busca"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nº do chamado ou razão social"
              sufixo={
                <span className="flex h-9 w-9 items-center justify-center text-content-secondary">
                  <Search className="h-4 w-4" aria-hidden />
                </span>
              }
            />
          </div>

          <div>
            <label htmlFor="f-status" className="mb-1 block text-xs text-content-secondary">
              Status
            </label>
            <Select
              id="f-status"
              value={filtros.status ?? ''}
              onChange={(e) => mudarFiltro({ status: (e.target.value || undefined) as StatusChamado })}
            >
              <option value="">Todos</option>
              {STATUS.map((s) => (
                <option key={s} value={s}>
                  {ROTULO_STATUS[s]}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="f-tipo" className="mb-1 block text-xs text-content-secondary">
              Tipo
            </label>
            <Select
              id="f-tipo"
              value={filtros.tipo_visita ?? ''}
              onChange={(e) =>
                mudarFiltro({ tipo_visita: (e.target.value || undefined) as TipoVisita })
              }
            >
              <option value="">Todos</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {ROTULO_TIPO_VISITA[t]}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="f-tecnico" className="mb-1 block text-xs text-content-secondary">
              Técnico externo
            </label>
            <Select
              id="f-tecnico"
              value={filtros.tecnico_externo_id ?? ''}
              onChange={(e) => mudarFiltro({ tecnico_externo_id: e.target.value || undefined })}
            >
              <option value="">Todos</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </Select>
          </div>

          {temFiltro && (
            <Button
              variante="secondary"
              onClick={() => {
                setBusca('')
                setFiltros({ page: 1, size: 20 })
              }}
            >
              <X className="h-4 w-4" aria-hidden />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-12 text-center">
          <AlertCircle className="h-8 w-8 text-error" aria-hidden />
          <p className="font-medium text-content">Não foi possível carregar os chamados.</p>
          <button
            onClick={() => void refetch()}
            className="text-sm font-medium text-primary underline underline-offset-2"
          >
            Tentar novamente
          </button>
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-surface" />
          ))}
        </div>
      ) : (
        <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
          {data && data.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
              <p className="font-medium text-content">
                {temFiltro ? 'Nenhum chamado com esses filtros.' : 'Nenhum chamado ainda.'}
              </p>
              <p className="mt-1 text-sm text-content-secondary">
                {temFiltro
                  ? 'Ajuste os filtros ou limpe a busca.'
                  : 'Abra o primeiro chamado para começar.'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
              <table className="w-full text-sm">
                <caption className="sr-only">Lista de chamados de visita</caption>
                <thead>
                  <tr className="border-b border-border bg-gray-50/60 text-left">
                    <th scope="col" className="px-4 py-3 font-medium text-content-label">Nº</th>
                    <th scope="col" className="px-4 py-3 font-medium text-content-label">Cliente</th>
                    <th scope="col" className="hidden px-4 py-3 font-medium text-content-label md:table-cell">Tipo</th>
                    <th scope="col" className="px-4 py-3 font-medium text-content-label">Status</th>
                    <th scope="col" className="hidden px-4 py-3 font-medium text-content-label lg:table-cell">Técnico</th>
                    <th scope="col" className="hidden px-4 py-3 font-medium text-content-label sm:table-cell">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((ch) => (
                    <tr
                      key={ch.id}
                      onClick={() => navigate(`/chamados/${ch.id}`)}
                      className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-accent/50"
                    >
                      <td className="px-4 py-3 font-medium tabular-nums text-content">
                        {/* O link real vive aqui: a linha inteira é atalho, mas
                            o teclado precisa de um alvo focável de verdade. */}
                        <Link
                          to={`/chamados/${ch.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded underline-offset-2 hover:underline focus-visible:outline-none
                            focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          #{ch.numero_chamado}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="block max-w-[260px] truncate text-content">
                          {ch.cliente_razao_social ?? '—'}
                        </span>
                        {ch.cliente_cidade && (
                          <span className="block text-xs text-content-secondary">
                            {ch.cliente_cidade}
                          </span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <TipoVisitaBadge tipo={ch.tipo_visita} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={ch.status} />
                      </td>
                      <td className="hidden max-w-[160px] truncate px-4 py-3 text-content-secondary lg:table-cell">
                        {ch.tecnico_externo_nome ?? '—'}
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 tabular-nums text-content-secondary sm:table-cell">
                        {fmtData(ch.data_visita_alterada ?? ch.data_proposta)}
                        {ch.data_visita_alterada && (
                          <span className="ml-1 text-xs text-warning">(reagendada)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && (
            <Paginacao
              pagina={data.page}
              paginas={data.pages}
              total={data.total}
              onMudar={(p) => setFiltros((f) => ({ ...f, page: p }))}
            />
          )}
        </div>
      )}
    </PageWrapper>
  )
}
