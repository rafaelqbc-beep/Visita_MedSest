import { Construction } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'

/**
 * Placeholder das telas que ainda não existem. Some conforme cada sessão
 * entrega a página de verdade.
 */
export function EmBreve({ titulo, sessao }: { titulo: string; sessao: string }) {
  return (
    <PageWrapper titulo={titulo}>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface p-12 text-center">
        <Construction className="h-8 w-8 text-content-secondary" aria-hidden />
        <p className="font-medium text-content">Tela em construção</p>
        <p className="text-sm text-content-secondary">Prevista para a sessão {sessao}.</p>
      </div>
    </PageWrapper>
  )
}
