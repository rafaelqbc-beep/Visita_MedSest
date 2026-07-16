import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  erro?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { erro = false, className, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={erro || undefined}
      className={cn(
        'w-full rounded-lg border bg-white px-3 py-2 text-content outline-none transition',
        'placeholder:text-content-secondary focus:ring-2 disabled:bg-gray-50 disabled:opacity-60',
        erro
          ? 'border-error focus:border-error focus:ring-error/30'
          : 'border-border focus:border-primary focus:ring-primary/30',
        className,
      )}
      {...props}
    />
  )
})
