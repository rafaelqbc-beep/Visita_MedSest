import { BrowserRouter, Navigate, Route, Routes, Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import LoginPage from '@/pages/auth/LoginPage'
import { AuthProvider } from '@/store/AuthContext'

/**
 * Placeholder do que vem na sessão #11 (layout) e #12 (dashboard).
 * Serve para provar que a sessão autenticada funciona de ponta a ponta.
 */
function Home() {
  const { usuario, sair } = useAuth()
  return (
    <div className="min-h-screen bg-background p-6">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-4 rounded-xl bg-primary px-5 py-3">
        <div className="flex items-center gap-3">
          <img src="/simbolo-medsest.svg" alt="" className="h-8" />
          <span className="font-semibold tracking-tightish text-white">MedSest Visita</span>
        </div>
        <Button variante="secondary" onClick={() => void sair()}>
          Sair
        </Button>
      </header>

      <div className="mx-auto mt-6 max-w-3xl rounded-xl border border-border bg-surface p-6 shadow-card">
        <h1 className="text-lg font-semibold tracking-tightish text-content">
          Olá, {usuario?.nome}
        </h1>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-content-secondary">E-mail</dt>
            <dd className="font-medium text-content">{usuario?.email}</dd>
          </div>
          <div>
            <dt className="text-content-secondary">Perfil</dt>
            <dd>
              <span className="rounded-lg bg-brand-green-bg px-2 py-0.5 font-medium text-brand-green">
                {usuario?.role}
              </span>
            </dd>
          </div>
        </dl>
        <p className="mt-6 text-sm text-content-secondary">
          Autenticação funcionando. O layout e o dashboard entram nas próximas sessões.
        </p>
      </div>
    </div>
  )
}

function SemPermissao() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <ShieldAlert className="h-10 w-10 text-warning" aria-hidden />
      <h1 className="text-xl font-semibold tracking-tightish text-content">Acesso negado</h1>
      <p className="max-w-sm text-content-secondary">
        Seu perfil não tem permissão para acessar esta página.
      </p>
      <Link to="/">
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
            <Route path="/" element={<Home />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
