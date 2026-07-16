import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, Loader2, Search } from 'lucide-react'
import { buscarClientes } from '@/services/chamadoService'
import { cn } from '@/lib/utils'
import type { Cliente } from '@/types'

interface Props {
  id: string
  valor: Cliente | null
  onChange: (cliente: Cliente | null) => void
  erro?: boolean
  disabled?: boolean
}

/** Espera o usuário parar de digitar antes de consultar a API. */
function useDebounce<T>(valor: T, ms = 300): T {
  const [atrasado, setAtrasado] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setAtrasado(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return atrasado
}

export function ClienteAutocomplete({ id, valor, onChange, erro, disabled }: Props) {
  const [aberto, setAberto] = useState(false)
  const [termo, setTermo] = useState('')
  const termoBusca = useDebounce(termo)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: clientes = [], isFetching } = useQuery({
    queryKey: ['clientes', 'busca', termoBusca],
    queryFn: () => buscarClientes(termoBusca),
    // Só busca com a lista aberta: sem isso a query rodaria em toda montagem.
    enabled: aberto,
  })

  // Clique fora fecha a lista.
  useEffect(() => {
    if (!aberto) return
    const aoClicar = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', aoClicar)
    return () => document.removeEventListener('mousedown', aoClicar)
  }, [aberto])

  function selecionar(cliente: Cliente) {
    onChange(cliente)
    setTermo('')
    setAberto(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setAberto((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-invalid={erro || undefined}
        className={cn(
          'flex h-10 min-h-touch w-full items-center justify-between gap-2 rounded-lg border bg-white',
          'px-3 text-left outline-none transition focus:ring-2 disabled:bg-gray-50 disabled:opacity-60',
          erro
            ? 'border-error focus:border-error focus:ring-error/30'
            : 'border-border focus:border-primary focus:ring-primary/30',
        )}
      >
        <span className={cn('truncate', valor ? 'text-content' : 'text-content-secondary')}>
          {valor ? valor.razao_social : 'Selecione o cliente'}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-content-secondary" aria-hidden />
      </button>

      {aberto && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-surface shadow-modal">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="h-4 w-4 shrink-0 text-content-secondary" aria-hidden />
            <input
              autoFocus
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Buscar por razão social ou CNPJ"
              aria-label="Buscar cliente"
              className="h-10 w-full bg-transparent text-sm text-content outline-none
                placeholder:text-content-secondary"
            />
            {isFetching && (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-content-secondary" aria-hidden />
            )}
          </div>

          <ul role="listbox" aria-label="Clientes" className="max-h-56 overflow-y-auto py-1">
            {clientes.length === 0 && !isFetching && (
              <li className="px-3 py-6 text-center text-sm text-content-secondary">
                {termoBusca ? 'Nenhum cliente encontrado.' : 'Digite para buscar.'}
              </li>
            )}
            {clientes.map((cliente) => (
              <li key={cliente.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={valor?.id === cliente.id}
                  onClick={() => selecionar(cliente)}
                  className="flex min-h-touch w-full items-center gap-2 px-3 py-2 text-left text-sm
                    transition-colors hover:bg-accent"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-content">{cliente.razao_social}</span>
                    {(cliente.cidade || cliente.cnpj) && (
                      <span className="block truncate text-xs text-content-secondary">
                        {[cliente.cnpj, cliente.cidade].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </span>
                  {valor?.id === cliente.id && (
                    <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
