/** Cache da IDENTIDADE do usuário logado (nome, perfil, id) para o app abrir
 *  offline depois de instalado.
 *
 *  ⚠️ Guarda SÓ o perfil — NUNCA a senha nem o access token. O token continua só
 *  em memória (localStorage ficaria exposto a XSS; ver sessão #10). O perfil não é
 *  credencial: sem token, nenhuma chamada autenticada passa. Ao voltar o sinal, a
 *  sessão se revalida sozinha (401 → refresh) ou cai no login. */
import type { Usuario } from '@/types'

const CHAVE = 'medsest:usuario'

export function salvarUsuarioCache(usuario: Usuario): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(usuario))
  } catch {
    /* modo privado / storage cheio: segue sem cache */
  }
}

export function lerUsuarioCache(): Usuario | null {
  try {
    const bruto = localStorage.getItem(CHAVE)
    return bruto ? (JSON.parse(bruto) as Usuario) : null
  } catch {
    return null
  }
}

export function limparUsuarioCache(): void {
  try {
    localStorage.removeItem(CHAVE)
  } catch {
    /* ignore */
  }
}
