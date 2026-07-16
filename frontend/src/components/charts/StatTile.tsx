import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatTileProps {
  label: string
  valor: string | number
  /** Unidade ("dias", "h") em texto menor, colada ao valor. */
  unidade?: string
  /** Explica a regra do número quando ela não é óbvia (ex.: ignora o período). */
  nota?: string
  icone?: ReactNode
}

/**
 * Um número é o gráfico. Nada de gráfico de uma barra só para mostrar um KPI.
 */
export function StatTile({ label, valor, unidade, nota, icone }: StatTileProps) {
  const vazio = valor === null || valor === undefined || valor === '—'
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-content-secondary">{label}</p>
        {icone && <span className="shrink-0 text-content-secondary">{icone}</span>}
      </div>
      <p className="mt-2 flex items-baseline gap-1">
        {/* Figuras proporcionais: tabular-nums deixa numero grande frouxo */}
        <span
          className={cn(
            'text-2xl font-semibold tracking-tightish',
            vazio ? 'text-content-secondary' : 'text-content',
          )}
        >
          {vazio ? '—' : valor}
        </span>
        {unidade && !vazio && (
          <span className="text-sm text-content-secondary">{unidade}</span>
        )}
      </p>
      {nota && <p className="mt-1 text-xs text-content-secondary">{nota}</p>}
    </div>
  )
}
