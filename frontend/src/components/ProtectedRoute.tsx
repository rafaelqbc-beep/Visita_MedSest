import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { Role } from '@/types'

interface ProtectedRouteProps {
  /** Se informado, só estes perfis entram. Sem isso, basta estar autenticado. */
  roles?: Role[]
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { autenticado, carregando, usuario } = useAuth()
  const location = useLocation()

  // Sem esta espera, um F5 numa rota protegida jogaria o usuário para o login
  // antes de a sessão ser retomada.
  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Carregando" />
      </div>
    )
  }

  if (!autenticado) {
    // Guarda o destino para voltar até ele depois do login.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && usuario && !roles.includes(usuario.role)) {
    return <Navigate to="/sem-permissao" replace />
  }

  return <Outlet />
}
