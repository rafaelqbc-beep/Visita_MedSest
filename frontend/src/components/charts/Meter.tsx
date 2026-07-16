interface MeterProps {
  /** 0–100. */
  percentual: number
  rotulo: string
  detalhe?: string
}

/**
 * Uma razão contra um limite é um meter — não uma pizza de duas fatias.
 *
 * O trilho é um passo mais claro da MESMA hue do preenchimento (azul sobre
 * azul), para o estado ser lido ao longo da barra inteira.
 */
export function Meter({ percentual, rotulo, detalhe }: MeterProps) {
  const valor = Math.max(0, Math.min(100, percentual))

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-content-secondary">{rotulo}</p>
        <p className="text-2xl font-semibold tracking-tightish text-content">
          {valor.toFixed(0)}%
        </p>
      </div>
      <div
        role="meter"
        aria-valuenow={valor}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={rotulo}
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#cde2fb]"
      >
        <div
          className="h-full rounded-full bg-secondary transition-[width] duration-300"
          style={{ width: `${valor}%` }}
        />
      </div>
      {detalhe && <p className="mt-2 text-sm text-content-secondary">{detalhe}</p>}
    </div>
  )
}
