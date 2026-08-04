/** Helpers de leitura dos campos de PGR — traduzem os códigos gravados (riscos,
 *  EPIs) em rótulos usando o catálogo, e formatam as medições do setor.
 *
 *  A categoria/grupo de cada código vem do catálogo na hora da exibição — nunca
 *  do banco (espelha a decisão do backend em `models/catalogo.py`). */
import type { Catalogo, Cargo, Setor } from '@/types/visita'

export interface GrupoRotulos {
  rotulo: string
  itens: string[]
}

/** '87.50' → '87,5 dB(A)'; null/'' → null. */
export function medicaoBr(valor: string | null, unidade: string): string | null {
  if (valor == null || valor.trim() === '') return null
  const n = Number(valor)
  if (Number.isNaN(n)) return null
  return `${String(n).replace('.', ',')} ${unidade}`
}

/** Medições informadas do setor, já formatadas (só as preenchidas). */
export function medicoesDoSetor(setor: Setor): string[] {
  return [
    medicaoBr(setor.ruido_db, 'dB(A)'),
    medicaoBr(setor.calor_ibutg, '°C IBUTG'),
    medicaoBr(setor.iluminancia_lux, 'lux'),
  ].filter((m): m is string => m !== null)
}

/** Riscos de um cargo agrupados por categoria, na ordem do catálogo. Códigos fora
 *  do catálogo (lista mudou depois) caem em "Outros" em vez de sumir. */
export function riscosAgrupados(catalogo: Catalogo, codigos: string[]): GrupoRotulos[] {
  const set = new Set(codigos)
  const grupos: GrupoRotulos[] = []
  const conhecidos = new Set<string>()
  for (const categoria of catalogo.riscos) {
    const itens: string[] = []
    for (const agente of categoria.agentes) {
      conhecidos.add(agente.codigo)
      if (set.has(agente.codigo)) itens.push(agente.rotulo)
    }
    if (itens.length) grupos.push({ rotulo: categoria.rotulo, itens })
  }
  const outros = codigos.filter((c) => !conhecidos.has(c))
  if (outros.length) grupos.push({ rotulo: 'Outros', itens: outros })
  return grupos
}

/** EPIs de um cargo agrupados por região do corpo, na ordem do catálogo. */
export function episAgrupados(catalogo: Catalogo, codigos: string[]): GrupoRotulos[] {
  const set = new Set(codigos)
  const grupos: GrupoRotulos[] = []
  const conhecidos = new Set<string>()
  for (const grupo of catalogo.epis) {
    const itens: string[] = []
    for (const item of grupo.itens) {
      conhecidos.add(item.codigo)
      if (set.has(item.codigo)) itens.push(item.rotulo)
    }
    if (itens.length) grupos.push({ rotulo: grupo.rotulo, itens })
  }
  const outros = codigos.filter((c) => !conhecidos.has(c))
  if (outros.length) grupos.push({ rotulo: 'Outros', itens: outros })
  return grupos
}

/** Lista plana de rótulos, na ordem do catálogo — para o resumo em texto corrido. */
export function achatar(grupos: GrupoRotulos[]): string[] {
  return grupos.flatMap((g) => g.itens)
}

/** Verdadeiro se o cargo tem algum dado de PGR preenchido (evita render vazio). */
export function cargoTemPgr(cargo: Cargo): boolean {
  return (
    cargo.num_trabalhadores != null ||
    Boolean(cargo.jornada) ||
    cargo.possui_riscos != null ||
    cargo.riscos.length > 0 ||
    Boolean(cargo.riscos_outros) ||
    cargo.utiliza_epis != null ||
    cargo.epis.length > 0 ||
    Boolean(cargo.epis_outros)
  )
}
