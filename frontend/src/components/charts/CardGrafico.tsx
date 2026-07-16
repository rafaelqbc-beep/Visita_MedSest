import { useId, useState, type ReactNode } from 'react'
import { BarChart3, Table2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CardGraficoProps {
  titulo: string
  descricao?: string
  /** Cada gráfico tem um par em tabela: é o equivalente acessível, e a via de
   *  leitura para quem não distingue as cores. Não é opcional. */
  tabela: ReactNode
  children: ReactNode
  className?: string
}

export function CardGrafico({ titulo, descricao, tabela, children, className }: CardGraficoProps) {
  const [verTabela, setVerTabela] = useState(false)
  const idConteudo = useId()

  return (
    <section className={cn('rounded-xl border border-border bg-surface p-4 shadow-card', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold tracking-tightish text-content">{titulo}</h2>
          {descricao && <p className="mt-0.5 text-sm text-content-secondary">{descricao}</p>}
        </div>
        <button
          type="button"
          onClick={() => setVerTabela((v) => !v)}
          aria-pressed={verTabela}
          aria-controls={idConteudo}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5
            text-xs font-medium text-content-label transition-colors hover:bg-accent
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {verTabela ? (
            <>
              <BarChart3 className="h-3.5 w-3.5" aria-hidden /> Gráfico
            </>
          ) : (
            <>
              <Table2 className="h-3.5 w-3.5" aria-hidden /> Tabela
            </>
          )}
        </button>
      </div>
      <div id={idConteudo}>{verTabela ? tabela : children}</div>
    </section>
  )
}

/** Tabela padrão dos pares acessíveis dos gráficos. */
export function TabelaDados({
  colunas,
  linhas,
}: {
  colunas: string[]
  linhas: (string | number)[][]
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            {colunas.map((c, i) => (
              <th
                key={c}
                scope="col"
                className={cn(
                  'pb-2 font-medium text-content-label',
                  i > 0 && 'text-right',
                )}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, i) => (
            <tr key={i} className="border-b border-border/60 last:border-0">
              {linha.map((celula, j) => (
                <td
                  key={j}
                  className={cn(
                    'py-2 text-content',
                    // tabular-nums só em coluna de números, que precisa alinhar
                    j > 0 && 'text-right tabular-nums',
                  )}
                >
                  {celula}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {linhas.length === 0 && (
        <p className="py-6 text-center text-sm text-content-secondary">Nenhum dado no período.</p>
      )}
    </div>
  )
}
