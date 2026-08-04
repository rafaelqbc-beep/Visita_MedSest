import { api, renovarSessao, setAccessToken } from '@/services/api'
import { estaOffline } from '@/lib/offline/mirror'
import { limparUsuarioCache, lerUsuarioCache, salvarUsuarioCache } from '@/lib/sessaoCache'
import type { Usuario } from '@/types'

interface RespostaLogin {
  access_token: string
  token_type: string
  usuario: Usuario
}

export async function login(email: string, senha: string): Promise<Usuario> {
  const { data } = await api.post<RespostaLogin>('/auth/login', { email, senha })
  setAccessToken(data.access_token)
  salvarUsuarioCache(data.usuario) // identidade para reabrir offline
  return data.usuario
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout')
  } finally {
    // Mesmo se a chamada falhar, a sessão local tem que morrer.
    setAccessToken(null)
    limparUsuarioCache()
  }
}

export async function obterUsuarioLogado(): Promise<Usuario> {
  const { data } = await api.get<Usuario>('/auth/me')
  return data
}

/**
 * Retoma a sessão ao abrir/recarregar a página.
 *
 * O access token vive só em memória, então some no F5. O cookie httpOnly de
 * refresh sobrevive — se ele ainda for válido, o usuário continua logado sem
 * digitar a senha de novo.
 *
 * A proteção contra chamadas concorrentes (StrictMode montando duas vezes,
 * várias abas abrindo juntas) mora em `renovarSessao`.
 *
 * Devolve null quando não há sessão a retomar (não é erro: é o caso normal de
 * quem nunca logou ou cujo refresh expirou).
 */
export async function restaurarSessao(): Promise<Usuario | null> {
  try {
    const { usuario } = await renovarSessao()
    salvarUsuarioCache(usuario)
    return usuario
  } catch (err) {
    setAccessToken(null)
    // Sem sinal (galpão): mantém a identidade em cache para o técnico seguir
    // trabalhando offline. Os dados vêm do espelho; ao reconectar, revalida.
    if (estaOffline(err)) {
      const cache = lerUsuarioCache()
      if (cache) return cache
    }
    // Erro de verdade (refresh expirado/revogado): sessão acabou.
    limparUsuarioCache()
    return null
  }
}
