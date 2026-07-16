import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { onSessaoExpirada } from '@/services/api'
import * as authService from '@/services/authService'
import type { Role, Usuario } from '@/types'

interface AuthContextValue {
  usuario: Usuario | null
  /** true enquanto a sessão é retomada no boot — evita piscar a tela de login. */
  carregando: boolean
  autenticado: boolean
  entrar: (email: string, senha: string) => Promise<void>
  sair: () => Promise<void>
  temRole: (...roles: Role[]) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(true)

  // Retoma a sessão no primeiro render: o access token morre no F5, mas o
  // cookie de refresh sobrevive.
  useEffect(() => {
    let ativo = true
    authService
      .restaurarSessao()
      .then((u) => {
        if (ativo) setUsuario(u)
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [])

  // O interceptor avisa quando o refresh falhou de vez (sessão expirada
  // durante o uso) — aqui o estado local acompanha.
  useEffect(() => {
    onSessaoExpirada(() => setUsuario(null))
  }, [])

  const entrar = useCallback(async (email: string, senha: string) => {
    setUsuario(await authService.login(email, senha))
  }, [])

  const sair = useCallback(async () => {
    await authService.logout()
    setUsuario(null)
  }, [])

  const temRole = useCallback(
    (...roles: Role[]) => (usuario ? roles.includes(usuario.role) : false),
    [usuario],
  )

  const valor = useMemo(
    () => ({
      usuario,
      carregando,
      autenticado: usuario !== null,
      entrar,
      sair,
      temRole,
    }),
    [usuario, carregando, entrar, sair, temRole],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
