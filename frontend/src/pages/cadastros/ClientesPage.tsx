import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Building2, ChevronRight, Plus, Search } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { AtivoBadge } from '@/components/AtivoBadge'
import { TipoVisitaBadge } from '@/components/TipoVisitaBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Paginacao } from '@/components/ui/Paginacao'
import { useDebounce } from '@/hooks/useDebounce'
import { useClientes } from '@/hooks/useCadastros'

export default function ClientesPage() {
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const buscaDebounce = useDebounce(busca, 300)

  const { data, isLoading, isError, refetch } = useClientes({
    search: buscaDebounce || undefined,
    page: pagina,
    size: 20,
  })
  const clientes = data?.items ?? []

  return (
    <PageWrapper
      titulo="Clientes"
      descricao="Empresas atendidas pela MedSest."
      acoes={
        <Button onClick={() => navigate('/clientes/novo')}>
          <Plus className="h-4 w-4" aria-hidden />
          Novo cliente
        </Button>
      }
    >
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-secondary"
            aria-hidden
          />
          <Input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value)
              setPagina(1)
            }}
            placeholder="Buscar por razão social ou CNPJ"
            className="pl-9"
            aria-label="Buscar cliente"
          />
        </div>
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-12 text-center">
          <AlertCircle className="h-8 w-8 text-error" aria-hidden />
          <p className="font-medium text-content">Não foi possível carregar os clientes.</p>
          <Button variante="secondary" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : isLoading ? (
        <div className="h-64 animate-pulse rounded-xl border border-border bg-surface" />
      ) : clientes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <Building2 className="mx-auto h-8 w-8 text-content-secondary" aria-hidden />
          <p className="mt-2 font-medium text-content">Nenhum cliente encontrado.</p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {clientes.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/clientes/${c.id}`)}
                  className="flex min-h-touch w-full items-center gap-3 rounded-xl border border-border
                    bg-surface p-4 text-left shadow-card transition-colors hover:bg-accent/30
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium text-content">{c.razao_social}</span>
                      <AtivoBadge ativo={c.ativo} />
                      {c.tipo_visita_padrao && <TipoVisitaBadge tipo={c.tipo_visita_padrao} />}
                    </span>
                    <span className="block truncate text-sm text-content-secondary">
                      {c.cnpj ?? 'sem CNPJ'}
                      {c.cidade && ` · ${c.cidade}${c.estado ? `/${c.estado}` : ''}`}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-content-secondary" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <Paginacao
            pagina={data?.page ?? 1}
            paginas={data?.pages ?? 1}
            total={data?.total ?? 0}
            onMudar={setPagina}
            substantivo={['cliente', 'clientes']}
          />
        </>
      )}
    </PageWrapper>
  )
}
