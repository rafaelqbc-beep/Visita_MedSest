import type { TooltipProps } from 'recharts'

/**
 * Tooltip padrão dos gráficos.
 *
 * O texto NUNCA veste a cor da série — quem carrega a identidade é o ponto
 * colorido ao lado. Uma hue clara como rótulo é ilegível na superfície.
 */
export function TooltipGrafico({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-modal">
      {label && <p className="mb-1 text-xs font-medium text-content-label">{label}</p>}
      <ul className="space-y-0.5">
        {payload.map((item) => (
          <li key={String(item.dataKey)} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-content-secondary">{item.name}</span>
            <span className="ml-auto font-medium tabular-nums text-content">{item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
