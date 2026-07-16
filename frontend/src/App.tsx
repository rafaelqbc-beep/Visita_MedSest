import { BrowserRouter, Navigate, Route, Routes, Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { rotaInicial } from '@/lib/navegacao'
import LoginPage from '@/pages/auth/LoginPage'
import ChamadoDetalhePage from '@/pages/chamados/ChamadoDetalhePage'
import ChamadosPage from '@/pages/chamados/ChamadosPage'
import NovoChamadoPage from '@/pages/chamados/NovoChamadoPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import ExecucaoVisitaPage from '@/pages/visitas/ExecucaoVisitaPage'
import VisitasPage from '@/pages/visitas/VisitasPage'
import { EmBreve } from '@/pages/EmBreve'
import { AuthProvider } from '@/store/AuthContext'

/**
 * As permissões de cada rota vêm de `lib/navegacao.ts`, a mesma fonte do menu
 * da sidebar — assim um item não some do menu e continua acessível pela URL.
 */
const PAGINAS = [
  { para: '/relatorios', titulo: 'Relatórios', sessao: '#16', roles: ['ADMIN', 'TECNICO_INTERNO'] },
  { para: '/clientes', titulo: 'Clientes', sessao: '#17', roles: ['ADMIN', 'GESTOR_COMERCIAL'] },
  { para: '/usuarios', titulo: 'Usuários', sessao: '#17', roles: ['ADMIN'] },
  { para: '/unidades', titulo: 'Unidades', sessao: '#17', roles: ['ADMIN'] },
] as const

/** Manda cada perfil para o primeiro item do menu dele. */
function Inicio() {
  const { usuario } = useAuth()
  return <Navigate to={rotaInicial(usuario?.role)} replace />
}

function SemPermissao() {
  const { usuario } = useAuth()
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <ShieldAlert className="h-10 w-10 text-warning" aria-hidden />
      <h1 className="text-xl font-semibold tracking-tightish text-content">Acesso negado</h1>
      <p className="max-w-sm text-content-secondary">
        Seu perfil não tem permissão para acessar esta página.
      </p>
      <Link to={rotaInicial(usuario?.role)}>
        <Button variante="secondary">Voltar ao início</Button>
      </Link>
    </main>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/sem-permissao" element={<SemPermissao />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Inicio />} />
              {/* Dashboard: todos os perfis; o backend recorta os números */}
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Chamados: mesmos perfis do item de menu em lib/navegacao.ts */}
              <Route element={<ProtectedRoute roles={['ADMIN', 'GESTOR_COMERCIAL']} />}>
                <Route path="/chamados" element={<ChamadosPage />} />
                <Route path="/chamados/novo" element={<NovoChamadoPage />} />
                <Route path="/chamados/:id" element={<ChamadoDetalhePage />} />
              </Route>

              {/* Visitas: a tela de campo do técnico externo */}
              <Route element={<ProtectedRoute roles={['TECNICO_EXTERNO']} />}>
                <Route path="/visitas" element={<VisitasPage />} />
                <Route path="/visitas/:id" element={<ExecucaoVisitaPage />} />
              </Route>

              {PAGINAS.map(({ para, titulo, sessao, roles }) => (
                <Route key={para} element={<ProtectedRoute roles={[...roles]} />}>
                  <Route path={para} element={<EmBreve titulo={titulo} sessao={sessao} />} />
                </Route>
              ))}
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
