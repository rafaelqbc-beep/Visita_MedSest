import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { ApiError } from '@/types'

/**
 * Cliente HTTP da aplicação.
 *
 * `withCredentials` é obrigatório: o refresh token vive num cookie httpOnly
 * (path /api/auth) que o navegador só envia se pedirmos.
 */
export const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
})

// O access token fica só em memória — em localStorage ficaria exposto a XSS.
// Isso significa que um F5 perde o token, e a sessão é retomada pelo refresh
// (ver `restaurarSessao` no authService).
let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

/** Chamado quando o refresh falha: quem estiver ouvindo desloga o usuário. */
type AoExpirar = () => void
let aoExpirar: AoExpirar = () => {}

export function onSessaoExpirada(callback: AoExpirar): void {
  aoExpirar = callback
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// --- Renovação de token ---
//
// O backend ROTACIONA o refresh token: cada /refresh invalida o anterior. Se
// cinco requisições tomarem 401 ao mesmo tempo e cada uma disparar seu próprio
// refresh, a primeira invalida o token das outras quatro e o usuário cai fora.
//
// Por isso só existe um refresh em andamento por vez: as demais requisições
// aguardam a mesma promise e depois são refeitas com o token novo.
let refreshEmAndamento: Promise<string> | null = null

const ROTA_REFRESH = '/auth/refresh'

// Rotas em que um 401 NÃO significa "token expirado" e renovar não faz sentido:
// no login é credencial errada; no refresh/logout é a própria sessão acabando.
// `/auth/me` fica de fora desta lista de propósito — é uma rota autenticada
// como qualquer outra e deve poder se recuperar de um token expirado.
const SEM_RETENTATIVA = ['/auth/login', '/auth/refresh', '/auth/logout']

/** Marca a requisição para não entrar em loop de retentativa. */
interface ConfigComRetry extends AxiosRequestConfig {
  _jaTentouRefresh?: boolean
}

async function renovarToken(): Promise<string> {
  // `axios` puro, não a instância `api`: o interceptor de resposta dela
  // reagiria ao 401 do próprio refresh e entraria em recursão.
  const { data } = await axios.post<{ access_token: string }>(
    `${api.defaults.baseURL}${ROTA_REFRESH}`,
    {},
    { withCredentials: true },
  )
  return data.access_token
}

api.interceptors.response.use(
  (resposta) => resposta,
  async (erro: AxiosError<ApiError>) => {
    const original = erro.config as ConfigComRetry | undefined

    const podeRenovar =
      erro.response?.status === 401 &&
      original &&
      !original._jaTentouRefresh &&
      !SEM_RETENTATIVA.some((rota) => original.url?.includes(rota))

    if (!podeRenovar) {
      return Promise.reject(erro)
    }

    original._jaTentouRefresh = true

    try {
      // Quem chegar durante um refresh em andamento espera o mesmo resultado.
      refreshEmAndamento ??= renovarToken().finally(() => {
        refreshEmAndamento = null
      })
      const novoToken = await refreshEmAndamento

      setAccessToken(novoToken)
      original.headers = { ...original.headers, Authorization: `Bearer ${novoToken}` }
      return api(original)
    } catch (falhaNoRefresh) {
      // Refresh token expirado ou revogado: não há como recuperar a sessão.
      setAccessToken(null)
      aoExpirar()
      return Promise.reject(falhaNoRefresh)
    }
  },
)

/** Mensagem de erro da API no formato `{detail, code}`, com fallback. */
export function mensagemDeErro(erro: unknown, padrao = 'Ocorreu um erro inesperado.'): string {
  if (axios.isAxiosError<ApiError>(erro)) {
    if (erro.response?.data?.detail) return erro.response.data.detail
    if (erro.code === 'ERR_NETWORK') return 'Sem conexão com o servidor.'
  }
  return padrao
}

/** Código de erro da API (`INVALID_CREDENTIALS`, `USER_INACTIVE`, ...). */
export function codigoDeErro(erro: unknown): string | undefined {
  return axios.isAxiosError<ApiError>(erro) ? erro.response?.data?.code : undefined
}
