/** Espelha `backend/app/schemas/{setor,cargo,foto}.py`. */

export interface Cargo {
  id: string
  setor_id: string
  nome_cargo: string
  descricao_funcao: string | null
  ordem: number
  // Campos de PGR (a exposição é da função)
  num_trabalhadores: number | null
  jornada: string | null
  /** null = não informado, false = declarou que não há, true = há. */
  possui_riscos: boolean | null
  riscos: string[]
  riscos_outros: string | null
  utiliza_epis: boolean | null
  epis: string[]
  epis_outros: string | null
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
  // Ambiente. As medições vêm como string do backend (Decimal serializado).
  maquinas: string | null
  ruido_db: string | null
  calor_ibutg: string | null
  iluminancia_lux: string | null
}

/** O GET de setores já traz cargos e fotos aninhados. */
export interface SetorDetalhe extends Setor {
  cargos: Cargo[]
  fotos: Foto[]
}

/** Campos de ambiente compartilhados entre criar e editar setor. */
export interface SetorCampos {
  nome: string
  descricao_ambiente?: string | null
  maquinas?: string | null
  ruido_db?: number | null
  calor_ibutg?: number | null
  iluminancia_lux?: number | null
}

export interface SetorCreate extends SetorCampos {
  chamado_id: string
  ordem?: number
}

export interface SetorUpdate extends Partial<SetorCampos> {
  ordem?: number
}

/** Campos de PGR compartilhados entre criar e editar cargo. */
export interface CargoCampos {
  nome_cargo: string
  descricao_funcao?: string | null
  num_trabalhadores?: number | null
  jornada?: string | null
  possui_riscos?: boolean | null
  riscos?: string[]
  riscos_outros?: string | null
  utiliza_epis?: boolean | null
  epis?: string[]
  epis_outros?: string | null
}

export interface CargoCreate extends CargoCampos {
  setor_id: string
  ordem?: number
}

export type CargoUpdate = Partial<CargoCampos>

export interface Geolocalizacao {
  latitude: number | null
  longitude: number | null
}

// --- Catálogo de riscos e EPIs (GET /api/catalogo) ---

export interface CatalogoItem {
  codigo: string
  rotulo: string
}

export interface CategoriaRisco {
  codigo: string
  rotulo: string
  agentes: CatalogoItem[]
}

export interface GrupoEpi {
  codigo: string
  rotulo: string
  itens: CatalogoItem[]
}

export interface Catalogo {
  riscos: CategoriaRisco[]
  epis: GrupoEpi[]
}
