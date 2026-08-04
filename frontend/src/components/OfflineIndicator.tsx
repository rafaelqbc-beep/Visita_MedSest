import { AlertTriangle, Cloud, CloudOff, RefreshCw } from 'lucide-react'
import { useSincronizacao } from '@/store/SincronizacaoContext'
import { cn } from '@/lib/utils'

/**
 * Status da conexão e da sincronização. Em campo, o técnico precisa saber na
 * hora se o que registrou já subiu ou está aguardando no tablet.
 */
export function OfflineIndicator({ className }: { className?: string }) {
  const { online, pendentes, estado, sincronizarAgora } = useSincronizacao()

  // Estilo e conteúdo por situação, do mais urgente ao normal.
  let cor: string
  let Icone = Cloud
  let curto: string
  let longo: string
  let girando = false
  let clicavel = false

  if (estado === 'sincronizando') {
    cor = 'border-blue-200 bg-blue-50 text-blue-800'
    Icone = RefreshCw
    girando = true
    curto = 'Enviando'
    longo = `Sincronizando${pendentes > 0 ? ` (${pendentes})` : ''}…`
  } else if (estado === 'erro') {
    cor = 'border-amber-200 bg-warning-bg text-amber-800'
    Icone = AlertTriangle
    clicavel = true
    curto = 'Erro'
    longo = `Falha ao sincronizar — tocar para tentar (${pendentes})`
  } else if (!online) {
    cor = 'border-amber-200 bg-warning-bg text-amber-800'
    Icone = CloudOff
    curto = 'Offline'
    longo = pendentes > 0 ? `Offline — ${pendentes} salva(s) no tablet` : 'Offline'
  } else if (pendentes > 0) {
    cor = 'border-amber-200 bg-warning-bg text-amber-800'
    clicavel = true
    curto = `${pendentes} a enviar`
    longo = `${pendentes} alteração(ões) a enviar — tocar para sincronizar`
  } else {
    cor = 'border-green-200 bg-success-bg text-green-800'
    curto = 'Online'
    longo = 'Online'
  }

  const conteudo = (
    <>
      <Icone className={cn('h-3.5 w-3.5', girando && 'animate-spin')} aria-hidden />
      <span className="hidden sm:inline">{longo}</span>
      <span className="sm:hidden">{curto}</span>
    </>
  )

  const classes = cn(
    'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium',
    cor,
    className,
  )

  if (clicavel) {
    return (
      <button
        type="button"
        onClick={sincronizarAgora}
        aria-live="polite"
        className={cn(classes, 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary')}
      >
        {conteudo}
      </button>
    )
  }

  return (
    <span aria-live="polite" className={classes}>
      {conteudo}
    </span>
  )
}
