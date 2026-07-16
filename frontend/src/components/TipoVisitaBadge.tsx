import { cn } from '@/lib/utils'
import type { TipoVisita } from '@/types'

const ESTILOS: Record<TipoVisita, string> = {
  NOVO_CLIENTE: 'bg-brand-green-bg text-brand-green border-green-200',
  RENOVACAO: 'bg-accent text-primary border-blue-200',
  VISITA_TECNICA: 'bg-gray-100 text-content-label border-border',
}

const ROTULOS: Record<TipoVisita, string> = {
  NOVO_CLIENTE: 'Novo Cliente',
  RENOVACAO: 'Renovação',
  VISITA_TECNICA: 'Visita Técnica',
}

export function TipoVisitaBadge({ tipo, className }: { tipo: TipoVisita; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-medium',
        ESTILOS[tipo],
        className,
      )}
    >
      {ROTULOS[tipo]}
    </span>
  )
}
