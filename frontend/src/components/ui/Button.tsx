import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variante = 'primary' | 'secondary' | 'action' | 'destructive'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  /** Mostra spinner e bloqueia o clique. */
  carregando?: boolean
}

const VARIANTES: Record<Variante, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary: 'border border-border bg-white text-content-label hover:bg-gray-50',
  // Verde da marca: para o passo que conclui um fluxo (Finalizar Visita),
  // não para "Salvar" comum.
  action: 'bg-brand-green text-white hover:bg-brand-green-hover',
  destructive: 'bg-error text-white hover:bg-red-800',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variante = 'primary', carregando = false, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || carregando}
      className={cn(
        'inline-flex h-10 min-h-touch items-center justify-center gap-2 rounded-lg px-4 font-medium',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        'focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTES[variante],
        className,
      )}
      {...props}
    >
      {carregando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
})
