import { useRef, useState } from 'react'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { useEnviarFoto, useRemoverFoto } from '@/hooks/useVisita'
import { mensagemDeErro } from '@/services/api'
import { urlDaFoto } from '@/services/visitaService'
import type { Foto } from '@/types/visita'

interface Props {
  chamadoId: string
  setorId: string
  fotos: Foto[]
}

export function FotosSetor({ chamadoId, setorId, fotos }: Props) {
  const enviar = useEnviarFoto(chamadoId)
  const remover = useRemoverFoto(chamadoId)
  const inputRef = useRef<HTMLInputElement>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [removendo, setRemovendo] = useState<Foto | null>(null)

  async function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files ?? [])
    // Limpa o input já: sem isso, escolher a mesma foto de novo não dispara o
    // change e o técnico acha que travou.
    e.target.value = ''
    if (arquivos.length === 0) return

    setErro(null)
    for (const arquivo of arquivos) {
      try {
        await enviar.mutateAsync({ setorId, arquivo })
      } catch (err) {
        setErro(mensagemDeErro(err, `Não foi possível enviar "${arquivo.name}".`))
        break
      }
    }
  }

  async function confirmarRemocao() {
    if (!removendo) return
    try {
      await remover.mutateAsync(removendo.id)
    } catch (err) {
      setErro(mensagemDeErro(err, 'Não foi possível remover a foto.'))
    } finally {
      setRemovendo(null)
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="font-medium text-content">
          Fotos {fotos.length > 0 && <span className="text-content-secondary">({fotos.length})</span>}
        </h4>
        <Button
          variante="secondary"
          onClick={() => inputRef.current?.click()}
          carregando={enviar.isPending}
        >
          <Camera className="h-4 w-4" aria-hidden />
          Adicionar foto
        </Button>
        {/* capture="environment" abre a câmera traseira direto no tablet, em
            vez do seletor de arquivos. */}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          multiple
          onChange={(e) => void aoEscolher(e)}
          className="hidden"
          aria-hidden
          tabIndex={-1}
        />
      </div>

      {erro && (
        <p role="alert" className="mb-3 rounded-lg bg-error-bg p-2 text-sm text-error">
          {erro}
        </p>
      )}

      {fotos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-content-secondary">
          Nenhuma foto neste setor.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fotos.map((foto) => (
            <li key={foto.id} className="group relative">
              <img
                src={urlDaFoto(foto.caminho_arquivo)}
                alt={foto.descricao || foto.nome_original || 'Foto do setor'}
                loading="lazy"
                className="aspect-[4/3] w-full rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => setRemovendo(foto)}
                aria-label={`Remover foto ${foto.nome_original ?? ''}`}
                // Sempre visível: no tablet não existe hover.
                className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center
                  rounded-lg bg-black/60 text-white transition-colors hover:bg-error
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {enviar.isPending && (
        <p className="mt-2 flex items-center gap-2 text-sm text-content-secondary">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Enviando foto…
        </p>
      )}

      <ConfirmDialog
        aberto={removendo !== null}
        titulo="Remover esta foto?"
        descricao="A foto sai do relatório da visita. Esta ação não pode ser desfeita."
        rotuloConfirmar="Remover"
        destrutivo
        carregando={remover.isPending}
        onConfirmar={() => void confirmarRemocao()}
        onCancelar={() => setRemovendo(null)}
      />
    </div>
  )
}
