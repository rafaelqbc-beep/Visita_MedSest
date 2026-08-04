import { cn } from '@/lib/utils'

/** Selo de estado ativo/inativo, para as listas de cadastro. */
export function AtivoBadge({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        ativo ? 'bg-success-bg text-success' : 'bg-gray-100 text-content-secondary',
      )}
    >
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  )
}
