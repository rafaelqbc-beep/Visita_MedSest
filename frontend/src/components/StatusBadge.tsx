import { cn } from '@/lib/utils'
import type { StatusChamado } from '@/types'

/**
 * Cores do design system. Os status de validação por e-mail
 * (AGUARDANDO_VALIDACAO/LIBERACAO) não existem mais — ver a mudança de escopo
 * no PROGRESS.md.
 */
const ESTILOS: Record<StatusChamado, string> = {
  PENDENTE: 'bg-warning-bg text-amber-800 border-amber-200',
  EM_ANDAMENTO: 'bg-info-bg text-blue-800 border-blue-200',
  FINALIZADO: 'bg-success-bg text-green-800 border-green-200',
  CANCELADO: 'bg-error-bg text-red-800 border-red-200',
}

const ROTULOS: Record<StatusChamado, string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
}

export function StatusBadge({ status, className }: { status: StatusChamado; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-medium',
        ESTILOS[status],
        className,
      )}
    >
      {ROTULOS[status]}
    </span>
  )
}
