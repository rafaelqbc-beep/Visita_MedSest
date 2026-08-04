import { achatar, cargoTemPgr, episAgrupados, riscosAgrupados } from '@/lib/pgr'
import type { Catalogo, Cargo } from '@/types/visita'

interface Props {
  cargo: Cargo
  catalogo: Catalogo | undefined
  /** 'detalhado' agrupa por categoria (relatório); 'compacto' usa texto corrido (conferência). */
  variante: 'compacto' | 'detalhado'
}

/** Linha "Nº de trabalhadores · Jornada", quando informados. */
function LinhaDados({ cargo }: { cargo: Cargo }) {
  const partes: string[] = []
  if (cargo.num_trabalhadores != null)
    partes.push(`${cargo.num_trabalhadores} ${cargo.num_trabalhadores === 1 ? 'trabalhador' : 'trabalhadores'}`)
  if (cargo.jornada) partes.push(cargo.jornada)
  if (partes.length === 0) return null
  return <p className="text-sm text-content-secondary">{partes.join(' · ')}</p>
}

/** Leitura dos campos de PGR de um cargo (riscos, EPIs, nº de trabalhadores, jornada). */
export function CargoPgr({ cargo, catalogo, variante }: Props) {
  if (!cargoTemPgr(cargo)) return null

  const gruposRisco = catalogo ? riscosAgrupados(catalogo, cargo.riscos) : []
  const gruposEpi = catalogo ? episAgrupados(catalogo, cargo.epis) : []

  // --- Compacto (conferência): texto corrido, uma linha por bloco ---
  if (variante === 'compacto') {
    const riscos = achatar(gruposRisco)
    if (cargo.riscos_outros) riscos.push(cargo.riscos_outros)
    const epis = achatar(gruposEpi)
    if (cargo.epis_outros) epis.push(cargo.epis_outros)

    return (
      <div className="mt-1 space-y-0.5 text-sm">
        <LinhaDados cargo={cargo} />
        {cargo.possui_riscos === false ? (
          <p className="text-content-secondary">
            <span className="font-medium text-content">Riscos:</span> nenhum identificado
          </p>
        ) : (
          riscos.length > 0 && (
            <p className="text-content-secondary">
              <span className="font-medium text-content">Riscos:</span> {riscos.join(', ')}
            </p>
          )
        )}
        {cargo.utiliza_epis === false ? (
          <p className="text-content-secondary">
            <span className="font-medium text-content">EPIs:</span> não utiliza
          </p>
        ) : (
          epis.length > 0 && (
            <p className="text-content-secondary">
              <span className="font-medium text-content">EPIs:</span> {epis.join(', ')}
            </p>
          )
        )}
      </div>
    )
  }

  // --- Detalhado (relatório): agrupado por categoria/região ---
  return (
    <div className="mt-2 space-y-2 text-sm">
      <LinhaDados cargo={cargo} />

      <div>
        <p className="font-medium text-content-label">Riscos</p>
        {cargo.possui_riscos === false ? (
          <p className="text-content-secondary">Nenhum risco identificado (declarado no local).</p>
        ) : gruposRisco.length > 0 || cargo.riscos_outros ? (
          <ul className="mt-0.5 space-y-0.5">
            {gruposRisco.map((g) => (
              <li key={g.rotulo} className="text-content-secondary">
                <span className="font-medium text-content">{g.rotulo}:</span> {g.itens.join(', ')}
              </li>
            ))}
            {cargo.riscos_outros && (
              <li className="text-content-secondary">
                <span className="font-medium text-content">Outros:</span> {cargo.riscos_outros}
              </li>
            )}
          </ul>
        ) : (
          <p className="text-content-secondary">Não informado.</p>
        )}
      </div>

      <div>
        <p className="font-medium text-content-label">EPIs</p>
        {cargo.utiliza_epis === false ? (
          <p className="text-content-secondary">Não utiliza EPI (declarado no local).</p>
        ) : gruposEpi.length > 0 || cargo.epis_outros ? (
          <ul className="mt-0.5 space-y-0.5">
            {gruposEpi.map((g) => (
              <li key={g.rotulo} className="text-content-secondary">
                <span className="font-medium text-content">{g.rotulo}:</span> {g.itens.join(', ')}
              </li>
            ))}
            {cargo.epis_outros && (
              <li className="text-content-secondary">
                <span className="font-medium text-content">Outros:</span> {cargo.epis_outros}
              </li>
            )}
          </ul>
        ) : (
          <p className="text-content-secondary">Não informado.</p>
        )}
      </div>
    </div>
  )
}
