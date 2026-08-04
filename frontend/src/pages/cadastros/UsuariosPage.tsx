import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ChevronRight, Plus, Search, Users } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { AtivoBadge } from '@/components/AtivoBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Paginacao } from '@/components/ui/Paginacao'
import { Select } from '@/components/ui/Select'
import { useDebounce } from '@/hooks/useDebounce'
import { useUsuarios } from '@/hooks/useCadastros'
import { ROTULO_ROLE } from '@/lib/navegacao'
import type { Role } from '@/types'

const ROLES: Role[] = ['ADMIN', 'GESTOR_COMERCIAL', 'TECNICO_EXTERNO', 'TECNICO_INTERNO']

export default function UsuariosPage() {
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [role, setRole] = useState<Role | ''>('')
  const [pagina, setPagina] = useState(1)
  const buscaDebounce = useDebounce(busca, 300)

  const { data, isLoading, isError, refetch } = useUsuarios({
    search: buscaDebounce || undefined,
    role: role || undefined,
    page: pagina,
    size: 20,
  })
  const usuarios = data?.items ?? []

  return (
    <PageWrapper
      titulo="Usuários"
      descricao="Equipe MedSest: gestores, técnicos externos e internos."
      acoes={
        <Button onClick={() => navigate('/usuarios/novo')}>
          <Plus className="h-4 w-4" aria-hidden />
          Novo usuário
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[16rem] flex-1">
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
            placeholder="Buscar por nome ou e-mail"
            className="pl-9"
            aria-label="Buscar usuário"
          />
        </div>
        <Select
          value={role}
          onChange={(e) => {
            setRole(e.target.value as Role | '')
            setPagina(1)
          }}
          aria-label="Filtrar por perfil"
          className="sm:w-56"
        >
          <option value="">Todos os perfis</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROTULO_ROLE[r]}
            </option>
          ))}
        </Select>
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-12 text-center">
          <AlertCircle className="h-8 w-8 text-error" aria-hidden />
          <p className="font-medium text-content">Não foi possível carregar os usuários.</p>
          <Button variante="secondary" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : isLoading ? (
        <div className="h-64 animate-pulse rounded-xl border border-border bg-surface" />
      ) : usuarios.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <Users className="mx-auto h-8 w-8 text-content-secondary" aria-hidden />
          <p className="mt-2 font-medium text-content">Nenhum usuário encontrado.</p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {usuarios.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/usuarios/${u.id}`)}
                  className="flex min-h-touch w-full items-center gap-3 rounded-xl border border-border
                    bg-surface p-4 text-left shadow-card transition-colors hover:bg-accent/30
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium text-content">{u.nome}</span>
                      <AtivoBadge ativo={u.ativo} />
                    </span>
                    <span className="block truncate text-sm text-content-secondary">
                      {u.email} · {ROTULO_ROLE[u.role]}
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
            substantivo={['usuário', 'usuários']}
          />
        </>
      )}
    </PageWrapper>
  )
}
