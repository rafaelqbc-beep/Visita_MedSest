import { api, setAccessToken } from '@/services/api'
import type { Usuario } from '@/types'

interface RespostaLogin {
  access_token: string
  token_type: string
  usuario: Usuario
}

export async function login(email: string, senha: string): Promise<Usuario> {
  const { data } = await api.post<RespostaLogin>('/auth/login', { email, senha })
  setAccessToken(data.access_token)
  return data.usuario
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout')
  } finally {
    // Mesmo se a chamada falhar, a sessão local tem que morrer.
    setAccessToken(null)
  }
}

export async function obterUsuarioLogado(): Promise<Usuario> {
  const { data } = await api.get<Usuario>('/auth/me')
  return data
}

// O backend rotaciona o refresh token: cada chamada invalida a anterior. Duas
// restaurações simultâneas fariam a segunda derrubar a primeira, e o usuário
// cairia no login. Isso acontece de verdade: o StrictMode do React monta o
// AuthProvider duas vezes em dev. A promise é compartilhada para que só exista
// um refresh de fato.
let restauracaoEmAndamento: Promise<Usuario | null> | null = null

/**
 * Retoma a sessão ao abrir/recarregar a página.
 *
 * O access token vive só em memória, então some no F5. O cookie httpOnly de
 * refresh sobrevive — se ele ainda for válido, o usuário continua logado sem
 * digitar a senha de novo.
 *
 * Devolve null quando não há sessão a retomar (não é erro: é o caso normal de
 * quem nunca logou ou cujo refresh expirou).
 */
export function restaurarSessao(): Promise<Usuario | null> {
  restauracaoEmAndamento ??= api
    .post<RespostaLogin>('/auth/refresh')
    .then(({ data }) => {
      setAccessToken(data.access_token)
      return data.usuario
    })
    .catch(() => {
      setAccessToken(null)
      return null
    })
    .finally(() => {
      restauracaoEmAndamento = null
    })
  return restauracaoEmAndamento
}
