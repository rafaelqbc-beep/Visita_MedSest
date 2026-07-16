import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { ApiError, Usuario } from '@/types'

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
// Isso significa que um F5 perde o token, e a sessão é retomada pelo refresh.
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

// ===========================================================================
// Renovação de token
// ===========================================================================
//
// O backend ROTACIONA o refresh token: cada /refresh invalida o anterior. Duas
// chamadas simultâneas com o mesmo token = a segunda encontra um token que já
// não existe, e a sessão morre. Por isso há DUAS camadas de proteção:
//
//   1. Dentro da aba  — uma promise compartilhada, para N requisições que
//      tomam 401 juntas dispararem um refresh só.
//   2. Entre abas     — Web Locks. O cookie é compartilhado pelo navegador,
//      então duas abas abrindo ao mesmo tempo mandariam o mesmo token e uma
//      seria deslogada (verificado: com 3 abas, uma caía). O lock serializa;
//      como o cookie é lido na hora do request, a segunda aba já usa o token
//      novo que a primeira acabou de receber.

interface RespostaRefresh {
  access_token: string
  usuario: Usuario
}

const NOME_LOCK = 'medsest:refresh'
const ROTA_REFRESH = '/auth/refresh'

// Rotas em que um 401 NÃO significa "token expirado" e renovar não faz sentido:
// no login é credencial errada; no refresh/logout é a própria sessão acabando.
// `/auth/me` fica de fora desta lista de propósito — é uma rota autenticada
// como qualquer outra e deve poder se recuperar de um token expirado.
const SEM_RETENTATIVA = ['/auth/login', '/auth/refresh', '/auth/logout']

let refreshEmAndamento: Promise<RespostaRefresh> | null = null

async function chamarRefresh(): Promise<RespostaRefresh> {
  // `axios` puro, não a instância `api`: o interceptor de resposta dela
  // reagiria ao 401 do próprio refresh e entraria em recursão.
  const { data } = await axios.post<RespostaRefresh>(
    `${api.defaults.baseURL}${ROTA_REFRESH}`,
    {},
    { withCredentials: true },
  )
  setAccessToken(data.access_token)
  return data
}

/** Serializa entre abas. Sem Web Locks (navegador antigo), roda direto. */
async function comLockEntreAbas<T>(tarefa: () => Promise<T>): Promise<T> {
  if (typeof navigator === 'undefined' || !navigator.locks) return tarefa()
  return (await navigator.locks.request(NOME_LOCK, tarefa)) as T
}

/**
 * Renova a sessão pelo cookie de refresh. Seguro para chamadas concorrentes,
 * dentro da mesma aba e entre abas.
 */
export function renovarSessao(): Promise<RespostaRefresh> {
  refreshEmAndamento ??= comLockEntreAbas(chamarRefresh).finally(() => {
    refreshEmAndamento = null
  })
  return refreshEmAndamento
}

/** Marca a requisição para não entrar em loop de retentativa. */
interface ConfigComRetry extends AxiosRequestConfig {
  _jaTentouRefresh?: boolean
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
      const { access_token } = await renovarSessao()
      original.headers = { ...original.headers, Authorization: `Bearer ${access_token}` }
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
