/** Tipos de domínio do MedSest Visita — espelham os enums e models do backend. */

export type Role = 'ADMIN' | 'GESTOR_COMERCIAL' | 'TECNICO_EXTERNO' | 'TECNICO_INTERNO'

export type TipoVisita = 'NOVO_CLIENTE' | 'RENOVACAO' | 'VISITA_TECNICA'

export type StatusChamado =
  | 'PENDENTE'
  | 'EM_ANDAMENTO'
  | 'AGUARDANDO_VALIDACAO'
  | 'AGUARDANDO_LIBERACAO'
  | 'FINALIZADO'
  | 'CANCELADO'

export type StatusRespostaValidacao = 'APROVADO' | 'COMENTADO'

export interface UnidadeMedsest {
  id: string
  nome: string
  cnpj: string
  endereco?: string | null
  cidade?: string | null
  estado?: string | null
  cep?: string | null
  telefone?: string | null
  email?: string | null
  ativo: boolean
}

export interface Usuario {
  id: string
  nome: string
  email: string
  telefone?: string | null
  whatsapp?: string | null
  role: Role
  unidade_id?: string | null
  ativo: boolean
}

export interface Cliente {
  id: string
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
  ativo: boolean
}

export interface Cargo {
  id: string
  setor_id: string
  nome_cargo: string
  descricao_funcao?: string | null
  ordem: number
}

export interface FotoSetor {
  id: string
  setor_id: string
  caminho_arquivo: string
  nome_original?: string | null
  descricao?: string | null
  tamanho_bytes?: number | null
}

export interface Setor {
  id: string
  chamado_id: string
  nome: string
  descricao_ambiente?: string | null
  ordem: number
  cargos?: Cargo[]
  fotos?: FotoSetor[]
}

export interface ValidacaoCliente {
  id: string
  chamado_id: string
  rodada: number
  status_resposta?: StatusRespostaValidacao | null
  comentarios?: string | null
  dt_resposta?: string | null
  created_at: string
}

export interface Chamado {
  id: string
  numero_chamado: number
  cliente_id: string
  unidade_medsest_id: string
  gestor_comercial_id: string
  tecnico_externo_id?: string | null
  tecnico_interno_id?: string | null
  tipo_visita: TipoVisita
  recomendacoes?: string | null
  data_proposta?: string | null
  data_visita_alterada?: string | null
  status: StatusChamado
  dt_abertura?: string | null
  dt_inicio_visita?: string | null
  dt_fim_visita?: string | null
  geoloc_latitude?: number | null
  geoloc_longitude?: number | null
  dt_email_validacao_enviado?: string | null
  dt_cliente_aprovou?: string | null
  dt_cliente_comentou?: string | null
  dt_liberado_tecnico_interno?: string | null
  dt_exportacao_word?: string | null
  rodadas_validacao: number
  cliente?: Cliente
  setores?: Setor[]
  validacoes?: ValidacaoCliente[]
}

export interface AuthTokens {
  access_token: string
  token_type: string
}

/** Envelope de erro padrão da API: { detail, code }. */
export interface ApiError {
  detail: string
  code?: string
}
