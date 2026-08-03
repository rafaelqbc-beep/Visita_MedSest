import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CatalogoItem } from '@/types/visita'

interface Grupo {
  codigo: string
  rotulo: string
  itens: CatalogoItem[]
}

interface Props {
  grupos: Grupo[]
  selecionados: string[]
  onChange: (codigos: string[]) => void
  /** Prefixo dos ids dos checkboxes (precisa ser único na página). */
  idPrefixo: string
}

/**
 * Multi-seleção em acordeão por grupo — riscos por categoria, EPIs por região do
 * corpo. Nunca mostra dezenas de caixas de uma vez: cada grupo abre/fecha e traz
 * o total de marcados ao lado. Feito para tablet: alvos de toque de 44px.
 *
 * Grupos que já têm itens marcados começam abertos (ao editar, o técnico vê logo
 * o que está selecionado); os demais começam fechados.
 */
export function AcordeaoSelecao({ grupos, selecionados, onChange, idPrefixo }: Props) {
  const selecionadoSet = new Set(selecionados)
  const [abertos, setAbertos] = useState<Set<string>>(
    () => new Set(grupos.filter((g) => g.itens.some((i) => selecionadoSet.has(i.codigo))).map((g) => g.codigo)),
  )

  function alternarGrupo(codigo: string) {
    setAbertos((atual) => {
      const novo = new Set(atual)
      if (novo.has(codigo)) novo.delete(codigo)
      else novo.add(codigo)
      return novo
    })
  }

  function alternarItem(codigo: string) {
    const novo = new Set(selecionadoSet)
    if (novo.has(codigo)) novo.delete(codigo)
    else novo.add(codigo)
    onChange([...novo])
  }

  return (
    <ul className="space-y-2">
      {grupos.map((grupo) => {
        const aberto = abertos.has(grupo.codigo)
        const marcados = grupo.itens.filter((i) => selecionadoSet.has(i.codigo)).length
        return (
          <li key={grupo.codigo} className="overflow-hidden rounded-lg border border-border">
            <button
              type="button"
              onClick={() => alternarGrupo(grupo.codigo)}
              aria-expanded={aberto}
              className="flex min-h-touch w-full items-center gap-3 bg-accent/40 px-3 py-2 text-left
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronDown
                className={cn('h-4 w-4 shrink-0 text-content-secondary transition-transform', aberto && 'rotate-180')}
                aria-hidden
              />
              <span className="flex-1 font-medium text-content">{grupo.rotulo}</span>
              {marcados > 0 && (
                <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">
                  {marcados}
                </span>
              )}
            </button>

            {aberto && (
              <div className="grid gap-1 p-2 sm:grid-cols-2">
                {grupo.itens.map((item) => {
                  const id = `${idPrefixo}-${item.codigo}`
                  const marcado = selecionadoSet.has(item.codigo)
                  return (
                    <label
                      key={item.codigo}
                      htmlFor={id}
                      className={cn(
                        'flex min-h-touch cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                        marcado ? 'bg-accent text-content' : 'hover:bg-accent/50',
                      )}
                    >
                      <input
                        id={id}
                        type="checkbox"
                        checked={marcado}
                        onChange={() => alternarItem(item.codigo)}
                        className="h-5 w-5 shrink-0 rounded border-border text-primary focus:ring-primary"
                      />
                      <span className="text-sm">{item.rotulo}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
