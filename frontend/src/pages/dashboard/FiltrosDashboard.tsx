import { Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ROTULO_TIPO_VISITA } from '@/lib/coresGrafico'
import type { FiltrosDashboard as Filtros } from '@/types/dashboard'
import type { TipoVisita } from '@/types'

interface Props {
  filtros: Filtros
  onChange: (filtros: Filtros) => void
}

const TIPOS: TipoVisita[] = ['NOVO_CLIENTE', 'RENOVACAO', 'VISITA_TECNICA']

/**
 * Uma única linha de filtros acima de tudo que ela recorta — nunca um filtro
 * dentro do card de um gráfico.
 */
export function FiltrosDashboard({ filtros, onChange }: Props) {
  const temFiltro = Boolean(filtros.periodo_inicio || filtros.periodo_fim || filtros.tipo_visita)

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-3 shadow-card">
      <div className="flex flex-wrap items-end gap-3">
        <span className="flex h-10 items-center gap-1.5 text-sm font-medium text-content-label">
          <Filter className="h-4 w-4" aria-hidden />
          Filtros
        </span>

        <div>
          <label htmlFor="periodo_inicio" className="mb-1 block text-xs text-content-secondary">
            De
          </label>
          <input
            id="periodo_inicio"
            type="date"
            value={filtros.periodo_inicio ?? ''}
            onChange={(e) => onChange({ ...filtros, periodo_inicio: e.target.value || undefined })}
            className="h-10 min-h-touch rounded-lg border border-border bg-white px-3 text-sm text-content
              outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label htmlFor="periodo_fim" className="mb-1 block text-xs text-content-secondary">
            Até
          </label>
          <input
            id="periodo_fim"
            type="date"
            value={filtros.periodo_fim ?? ''}
            onChange={(e) => onChange({ ...filtros, periodo_fim: e.target.value || undefined })}
            className="h-10 min-h-touch rounded-lg border border-border bg-white px-3 text-sm text-content
              outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label htmlFor="tipo_visita" className="mb-1 block text-xs text-content-secondary">
            Tipo de visita
          </label>
          <select
            id="tipo_visita"
            value={filtros.tipo_visita ?? ''}
            onChange={(e) =>
              onChange({ ...filtros, tipo_visita: (e.target.value || undefined) as TipoVisita })
            }
            className="h-10 min-h-touch rounded-lg border border-border bg-white px-3 text-sm text-content
              outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Todos</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {ROTULO_TIPO_VISITA[t]}
              </option>
            ))}
          </select>
        </div>

        {temFiltro && (
          <Button variante="secondary" onClick={() => onChange({})}>
            <X className="h-4 w-4" aria-hidden />
            Limpar
          </Button>
        )}
      </div>
    </div>
  )
}
