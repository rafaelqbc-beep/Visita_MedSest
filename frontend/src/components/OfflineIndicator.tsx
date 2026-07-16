import { Cloud, CloudOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/utils'

/**
 * Status da conexão. Em campo, o técnico precisa saber na hora se o que ele
 * registrou já subiu ou está aguardando no tablet.
 */
export function OfflineIndicator({ className }: { className?: string }) {
  const online = useOnlineStatus()

  return (
    <span
      // aria-live: quem usa leitor de tela é avisado da queda sem precisar
      // procurar o indicador.
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium',
        online
          ? 'border-green-200 bg-success-bg text-green-800'
          : 'border-amber-200 bg-warning-bg text-amber-800',
        className,
      )}
    >
      {online ? (
        <Cloud className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <CloudOff className="h-3.5 w-3.5" aria-hidden />
      )}
      <span className="hidden sm:inline">
        {online ? 'Online' : 'Offline — dados salvos localmente'}
      </span>
      <span className="sm:hidden">{online ? 'Online' : 'Offline'}</span>
    </span>
  )
}
