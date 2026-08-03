import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Plus, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { useRemoverCargo } from '@/hooks/useVisita'
import { mensagemDeErro } from '@/services/api'
import type { Cargo } from '@/types/visita'

interface Props {
  chamadoId: string
  setorId: string
  cargos: Cargo[]
}

/** Resumo do cargo na lista: o que foi preenchido, sem abrir o editor. */
function resumo(cargo: Cargo): string {
  const partes: string[] = []
  if (cargo.num_trabalhadores != null) partes.push(`${cargo.num_trabalhadores} trab.`)
  if (cargo.possui_riscos === false) partes.push('sem riscos')
  else if (cargo.riscos.length > 0 || cargo.riscos_outros)
    partes.push(`${cargo.riscos.length + (cargo.riscos_outros ? 1 : 0)} riscos`)
  if (cargo.utiliza_epis === false) partes.push('sem EPI')
  else if (cargo.epis.length > 0 || cargo.epis_outros)
    partes.push(`${cargo.epis.length + (cargo.epis_outros ? 1 : 0)} EPIs`)
  return partes.join(' · ')
}

export function CargosSetor({ chamadoId, setorId, cargos }: Props) {
  const navigate = useNavigate()
  const remover = useRemoverCargo(chamadoId)
  const [erro, setErro] = useState<string | null>(null)
  const [removendo, setRemovendo] = useState<Cargo | null>(null)

  const base = `/visitas/${chamadoId}/setores/${setorId}/cargos`

  async function confirmarRemocao() {
    if (!removendo) return
    try {
      await remover.mutateAsync(removendo.id)
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível remover o cargo.'))
    } finally {
      setRemovendo(null)
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="font-medium text-content">
          Cargos e funções{' '}
          {cargos.length > 0 && <span className="text-content-secondary">({cargos.length})</span>}
        </h4>
        <Button variante="secondary" onClick={() => navigate(`${base}/novo`)}>
          <Plus className="h-4 w-4" aria-hidden />
          Adicionar cargo
        </Button>
      </div>

      {erro && (
        <p role="alert" className="mb-2 text-sm text-error">
          {erro}
        </p>
      )}

      {cargos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-content-secondary">
          Nenhum cargo neste setor.
        </p>
      ) : (
        <ul className="space-y-2">
          {cargos.map((cargo) => {
            const detalhe = resumo(cargo)
            return (
              <li
                key={cargo.id}
                className="flex items-stretch gap-2 rounded-lg border border-border"
              >
                <button
                  type="button"
                  onClick={() => navigate(`${base}/${cargo.id}`)}
                  className="flex min-h-touch flex-1 items-center gap-3 rounded-l-lg p-3 text-left
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-content">{cargo.nome_cargo}</span>
                    {detalhe && (
                      <span className="block truncate text-sm text-content-secondary">{detalhe}</span>
                    )}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-content-secondary" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setRemovendo(cargo)}
                  aria-label={`Remover cargo ${cargo.nome_cargo}`}
                  className="flex w-11 shrink-0 items-center justify-center rounded-r-lg
                    text-content-secondary transition-colors hover:bg-error-bg hover:text-error
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        aberto={removendo !== null}
        titulo={`Remover "${removendo?.nome_cargo}"?`}
        descricao="O cargo sai do relatório da visita. Esta ação não pode ser desfeita."
        rotuloConfirmar="Remover"
        destrutivo
        carregando={remover.isPending}
        onConfirmar={() => void confirmarRemocao()}
        onCancelar={() => setRemovendo(null)}
      />
    </div>
  )
}
