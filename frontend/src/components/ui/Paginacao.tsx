import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Props {
  pagina: number
  paginas: number
  total: number
  onMudar: (pagina: number) => void
}

export function Paginacao({ pagina, paginas, total, onMudar }: Props) {
  if (paginas <= 1) {
    return (
      <p className="py-3 text-sm text-content-secondary">
        {total} {total === 1 ? 'chamado' : 'chamados'}
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <p className="text-sm text-content-secondary">
        Página {pagina} de {paginas} · {total} chamados
      </p>
      <div className="flex items-center gap-2">
        <Button
          variante="secondary"
          onClick={() => onMudar(pagina - 1)}
          disabled={pagina <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Anterior
        </Button>
        <Button
          variante="secondary"
          onClick={() => onMudar(pagina + 1)}
          disabled={pagina >= paginas}
          aria-label="Próxima página"
        >
          Próxima
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
