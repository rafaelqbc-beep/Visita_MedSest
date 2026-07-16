import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { useCriarCargo, useRemoverCargo } from '@/hooks/useVisita'
import { mensagemDeErro } from '@/services/api'
import type { Cargo } from '@/types/visita'

interface Props {
  chamadoId: string
  setorId: string
  cargos: Cargo[]
}

export function CargosSetor({ chamadoId, setorId, cargos }: Props) {
  const criar = useCriarCargo(chamadoId)
  const remover = useRemoverCargo(chamadoId)
  const [abrindo, setAbrindo] = useState(false)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [removendo, setRemovendo] = useState<Cargo | null>(null)

  async function adicionar() {
    if (!nome.trim()) {
      setErro('Informe o nome do cargo.')
      return
    }
    setErro(null)
    try {
      await criar.mutateAsync({
        setor_id: setorId,
        nome_cargo: nome.trim(),
        descricao_funcao: descricao.trim() || null,
        ordem: cargos.length,
      })
      // Limpa e mantém aberto: o técnico costuma cadastrar vários seguidos.
      setNome('')
      setDescricao('')
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível adicionar o cargo.'))
    }
  }

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
        {!abrindo && (
          <Button variante="secondary" onClick={() => setAbrindo(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Adicionar cargo
          </Button>
        )}
      </div>

      {cargos.length === 0 && !abrindo ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-content-secondary">
          Nenhum cargo neste setor.
        </p>
      ) : (
        <ul className="space-y-2">
          {cargos.map((cargo) => (
            <li
              key={cargo.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-content">{cargo.nome_cargo}</p>
                {cargo.descricao_funcao && (
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-content-secondary">
                    {cargo.descricao_funcao}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setRemovendo(cargo)}
                aria-label={`Remover cargo ${cargo.nome_cargo}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg
                  text-content-secondary transition-colors hover:bg-error-bg hover:text-error
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {abrindo && (
        <div className="mt-3 space-y-3 rounded-lg border border-primary/30 bg-accent/40 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-content-label">Novo cargo</p>
            <button
              type="button"
              onClick={() => {
                setAbrindo(false)
                setNome('')
                setDescricao('')
                setErro(null)
              }}
              aria-label="Fechar novo cargo"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-content-secondary
                hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <FormField label="Cargo" htmlFor={`cargo-nome-${setorId}`}>
            <Input
              id={`cargo-nome-${setorId}`}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Operador de prensa"
              erro={!!erro && !nome.trim()}
              autoFocus
            />
          </FormField>

          <FormField label="Descrição da função" htmlFor={`cargo-desc-${setorId}`}>
            <Textarea
              id={`cargo-desc-${setorId}`}
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="O que a pessoa faz neste setor (opcional)."
            />
          </FormField>

          {erro && (
            <p role="alert" className="text-sm text-error">
              {erro}
            </p>
          )}

          <Button onClick={() => void adicionar()} carregando={criar.isPending} className="w-full">
            Adicionar cargo
          </Button>
        </div>
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
