import { useEffect, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'

interface Props {
  aberto: boolean
  titulo: string
  descricao: string
  rotuloConfirmar?: string
  destrutivo?: boolean
  carregando?: boolean
  /** Pede uma justificativa antes de confirmar. */
  motivo?: {
    label: string
    obrigatorio: boolean
    placeholder?: string
  }
  onConfirmar: (motivo?: string) => void
  onCancelar: () => void
}

export function ConfirmDialog({
  aberto,
  titulo,
  descricao,
  rotuloConfirmar = 'Confirmar',
  destrutivo = false,
  carregando = false,
  motivo,
  onConfirmar,
  onCancelar,
}: Props) {
  const refCancelar = useRef<HTMLButtonElement>(null)
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState(false)

  useEffect(() => {
    if (!aberto) {
      setTexto('')
      setErro(false)
      return
    }
    // Foco no botão seguro, não no destrutivo: um Enter distraído não pode
    // cancelar um chamado.
    refCancelar.current?.focus()
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aberto, onCancelar])

  function confirmar() {
    if (motivo?.obrigatorio && !texto.trim()) {
      setErro(true)
      return
    }
    onConfirmar(texto.trim() || undefined)
  }

  if (!aberto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancelar}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-titulo"
        aria-describedby="confirm-descricao"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-surface p-6 shadow-modal"
      >
        <div className="flex gap-3">
          {destrutivo && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error-bg">
              <AlertTriangle className="h-5 w-5 text-error" aria-hidden />
            </span>
          )}
          <div className="min-w-0">
            <h2 id="confirm-titulo" className="font-semibold tracking-tightish text-content">
              {titulo}
            </h2>
            <p id="confirm-descricao" className="mt-1 text-sm text-content-secondary">
              {descricao}
            </p>
          </div>
        </div>

        {motivo && (
          <div className="mt-4 space-y-1.5">
            <label htmlFor="confirm-motivo" className="block text-sm font-medium text-content-label">
              {motivo.label}
              {!motivo.obrigatorio && (
                <span className="ml-1 font-normal text-content-secondary">(opcional)</span>
              )}
            </label>
            <Textarea
              id="confirm-motivo"
              rows={3}
              value={texto}
              erro={erro}
              placeholder={motivo.placeholder}
              onChange={(e) => {
                setTexto(e.target.value)
                if (erro) setErro(false)
              }}
            />
            {erro && (
              <p role="alert" className="text-sm text-error">
                Informe o motivo para continuar.
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button ref={refCancelar} variante="secondary" onClick={onCancelar} disabled={carregando}>
            Voltar
          </Button>
          <Button
            variante={destrutivo ? 'destructive' : 'primary'}
            onClick={confirmar}
            carregando={carregando}
          >
            {rotuloConfirmar}
          </Button>
        </div>
      </div>
    </div>
  )
}
