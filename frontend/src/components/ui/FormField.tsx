import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  /** Id do input que o label aponta — sem isso o clique no label não foca. */
  htmlFor: string
  erro?: string
  children: ReactNode
}

export function FormField({ label, htmlFor, erro, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-content-label">
        {label}
      </label>
      {children}
      {erro && (
        <p role="alert" className="text-sm text-error">
          {erro}
        </p>
      )}
    </div>
  )
}
