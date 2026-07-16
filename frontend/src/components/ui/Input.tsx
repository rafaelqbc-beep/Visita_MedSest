import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  erro?: boolean
  /** Ícone/botão encostado na borda direita (ex.: mostrar senha). */
  sufixo?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { erro = false, sufixo, className, ...props },
  ref,
) {
  const campo = (
    <input
      ref={ref}
      aria-invalid={erro || undefined}
      className={cn(
        'h-10 min-h-touch w-full rounded-lg border bg-white px-3 text-content outline-none transition',
        'placeholder:text-content-secondary focus:ring-2 disabled:bg-gray-50 disabled:opacity-60',
        erro
          ? 'border-error focus:border-error focus:ring-error/30'
          : 'border-border focus:border-primary focus:ring-primary/30',
        sufixo && 'pr-11',
        className,
      )}
      {...props}
    />
  )

  if (!sufixo) return campo

  return (
    <div className="relative">
      {campo}
      <div className="absolute inset-y-0 right-0 flex items-center pr-1">{sufixo}</div>
    </div>
  )
})
