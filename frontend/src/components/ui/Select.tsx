import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  erro?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { erro = false, className, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={erro || undefined}
      className={cn(
        'h-10 min-h-touch w-full rounded-lg border bg-white px-3 text-content outline-none transition',
        'focus:ring-2 disabled:bg-gray-50 disabled:opacity-60',
        erro
          ? 'border-error focus:border-error focus:ring-error/30'
          : 'border-border focus:border-primary focus:ring-primary/30',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
})
