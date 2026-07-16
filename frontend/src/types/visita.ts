/** Espelha `backend/app/schemas/{setor,cargo,foto}.py`. */

export interface Cargo {
  id: string
  setor_id: string
  nome_cargo: string
  descricao_funcao: string | null
  ordem: number
}

export interface Foto {
  id: string
  setor_id: string
  caminho_arquivo: string
  nome_original: string | null
  descricao: string | null
  tamanho_bytes: number | null
  created_at: string
}

export interface Setor {
  id: string
  chamado_id: string
  nome: string
  descricao_ambiente: string | null
  ordem: number
}

/** O GET de setores já traz cargos e fotos aninhados. */
export interface SetorDetalhe extends Setor {
  cargos: Cargo[]
  fotos: Foto[]
}

export interface SetorCreate {
  chamado_id: string
  nome: string
  descricao_ambiente?: string | null
  ordem?: number
}

export interface SetorUpdate {
  nome?: string
  descricao_ambiente?: string | null
  ordem?: number
}

export interface CargoCreate {
  setor_id: string
  nome_cargo: string
  descricao_funcao?: string | null
  ordem?: number
}

export interface CargoUpdate {
  nome_cargo?: string
  descricao_funcao?: string | null
  ordem?: number
}

export interface Geolocalizacao {
  latitude: number | null
  longitude: number | null
}
