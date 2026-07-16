import type { ReactNode } from 'react'

interface PageWrapperProps {
  titulo: string
  descricao?: string
  /** Ações da página (ex.: "Novo chamado"), alinhadas ao título. */
  acoes?: ReactNode
  children: ReactNode
}

export function PageWrapper({ titulo, descricao, acoes, children }: PageWrapperProps) {
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tightish text-content">{titulo}</h1>
          {descricao && <p className="mt-1 text-content-secondary">{descricao}</p>}
        </div>
        {acoes && <div className="flex items-center gap-2">{acoes}</div>}
      </div>
      {children}
    </div>
  )
}
