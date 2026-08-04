/** Tipos de escrita dos cadastros admin — espelham os schemas do backend
 *  (`schemas/{cliente,usuario,unidade}.py`). Os tipos de leitura (Cliente,
 *  Usuario, UnidadeMedsest) vivem em `@/types`. */
import type { Role, TipoVisita } from '@/types'

export interface FiltrosPagina {
  page?: number
  size?: number
  search?: string
  ativo?: boolean
}

// --- Cliente ---
export interface ClienteCampos {
  razao_social: string
  cnpj?: string | null
  nome_fantasia?: string | null
  filial?: string | null
  endereco?: string | null
  cidade?: string | null
  estado?: string | null
  cep?: string | null
  nome_contato?: string | null
  celular_contato?: string | null
  email_contato?: string | null
  tipo_visita_padrao?: TipoVisita | null
  gestor_comercial_id?: string | null
  unidade_medsest_id?: string | null
}
export type ClienteCreate = ClienteCampos
export type ClienteUpdate = Partial<ClienteCampos> & { ativo?: boolean }
export interface FiltrosCliente extends FiltrosPagina {
  unidade_id?: string
  tipo_visita?: TipoVisita
}

// --- Usuário ---
export interface UsuarioCampos {
  nome: string
  email: string
  telefone?: string | null
  whatsapp?: string | null
  role: Role
  unidade_id?: string | null
}
export type UsuarioCreate = UsuarioCampos & { senha: string }
export type UsuarioUpdate = Partial<UsuarioCampos> & { senha?: string; ativo?: boolean }
export interface FiltrosUsuario extends FiltrosPagina {
  role?: Role
  unidade_id?: string
}

// --- Unidade ---
export interface UnidadeCampos {
  nome: string
  cnpj: string
  endereco?: string | null
  cidade?: string | null
  estado?: string | null
  cep?: string | null
  telefone?: string | null
  email?: string | null
}
export type UnidadeCreate = UnidadeCampos
/** CNPJ da unidade não muda pelo update (o backend não aceita). */
export type UnidadeUpdate = Partial<Omit<UnidadeCampos, 'cnpj'>> & { ativo?: boolean }
export type FiltrosUnidade = FiltrosPagina
