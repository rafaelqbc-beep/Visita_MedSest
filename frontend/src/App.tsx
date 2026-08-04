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
import ClienteFormPage from '@/pages/cadastros/ClienteFormPage'
import ClientesPage from '@/pages/cadastros/ClientesPage'
import UnidadeFormPage from '@/pages/cadastros/UnidadeFormPage'
import UnidadesPage from '@/pages/cadastros/UnidadesPage'
import UsuarioFormPage from '@/pages/cadastros/UsuarioFormPage'
import UsuariosPage from '@/pages/cadastros/UsuariosPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import RelatorioDetalhePage from '@/pages/relatorios/RelatorioDetalhePage'
import RelatoriosPage from '@/pages/relatorios/RelatoriosPage'
import CargoEditorPage from '@/pages/visitas/CargoEditorPage'
import ConferenciaPage from '@/pages/visitas/ConferenciaPage'
import ExecucaoVisitaPage from '@/pages/visitas/ExecucaoVisitaPage'
import VisitasPage from '@/pages/visitas/VisitasPage'
import { AuthProvider } from '@/store/AuthContext'

/**
 * As permissões de cada rota vêm de `lib/navegacao.ts`, a mesma fonte do menu
 * da sidebar — assim um item não some do menu e continua acessível pela URL.
 */
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
                <Route
                  path="/visitas/:id/setores/:setorId/cargos/novo"
                  element={<CargoEditorPage />}
                />
                <Route
                  path="/visitas/:id/setores/:setorId/cargos/:cargoId"
                  element={<CargoEditorPage />}
                />
                <Route path="/visitas/:id/conferencia" element={<ConferenciaPage />} />
              </Route>

              {/* Relatórios: o entregável do técnico interno */}
              <Route element={<ProtectedRoute roles={['ADMIN', 'TECNICO_INTERNO']} />}>
                <Route path="/relatorios" element={<RelatoriosPage />} />
                <Route path="/relatorios/:id" element={<RelatorioDetalhePage />} />
              </Route>

              {/* Cadastros: clientes (ADMIN + GESTOR); usuários e unidades (só ADMIN) */}
              <Route element={<ProtectedRoute roles={['ADMIN', 'GESTOR_COMERCIAL']} />}>
                <Route path="/clientes" element={<ClientesPage />} />
                <Route path="/clientes/novo" element={<ClienteFormPage />} />
                <Route path="/clientes/:id" element={<ClienteFormPage />} />
              </Route>
              <Route element={<ProtectedRoute roles={['ADMIN']} />}>
                <Route path="/usuarios" element={<UsuariosPage />} />
                <Route path="/usuarios/novo" element={<UsuarioFormPage />} />
                <Route path="/usuarios/:id" element={<UsuarioFormPage />} />
                <Route path="/unidades" element={<UnidadesPage />} />
                <Route path="/unidades/novo" element={<UnidadeFormPage />} />
                <Route path="/unidades/:id" element={<UnidadeFormPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
