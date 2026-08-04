import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ClipboardCheck,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { TipoVisitaBadge } from '@/components/TipoVisitaBadge'
import { SetorMedicoes } from '@/components/pgr/SetorMedicoes'
import { Button } from '@/components/ui/Button'
import { useChamado } from '@/hooks/useChamados'
import { useAtualizarSetor, useCriarSetor, useRemoverSetor, useSetores } from '@/hooks/useVisita'
import { dataHora } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { mensagemDeErro } from '@/services/api'
import { CargosSetor } from '@/pages/visitas/CargosSetor'
import { FotosSetor } from '@/pages/visitas/FotosSetor'
import { SetorForm } from '@/pages/visitas/SetorForm'
import type { SetorCampos, SetorDetalhe } from '@/types/visita'

function CardSetor({
  setor,
  chamadoId,
  indice,
  aberto,
  editavel,
  editando,
  salvandoEdicao,
  onAlternar,
  onRemover,
  onEditar,
  onCancelarEdicao,
  onSalvarEdicao,
}: {
  setor: SetorDetalhe
  chamadoId: string
  indice: number
  aberto: boolean
  editavel: boolean
  editando: boolean
  salvandoEdicao: boolean
  onAlternar: () => void
  onRemover: () => void
  onEditar: () => void
  onCancelarEdicao: () => void
  onSalvarEdicao: (campos: SetorCampos) => Promise<void>
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="flex items-center gap-2 p-4">
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={aberto}
          className="flex min-h-touch flex-1 items-center gap-3 rounded-lg text-left
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent
              text-sm font-semibold text-primary"
          >
            {indice + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-lg font-semibold tracking-tightish text-content">
              {setor.nome}
            </span>
            <span className="block text-sm text-content-secondary">
              {setor.cargos.length} {setor.cargos.length === 1 ? 'cargo' : 'cargos'} ·{' '}
              {setor.fotos.length} {setor.fotos.length === 1 ? 'foto' : 'fotos'}
            </span>
          </span>
          <ChevronDown
            className={cn('h-5 w-5 shrink-0 text-content-secondary transition-transform',
              aberto && 'rotate-180')}
            aria-hidden
          />
        </button>
        {editavel && (
          <button
            type="button"
            onClick={onRemover}
            aria-label={`Remover setor ${setor.nome}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg
              text-content-secondary transition-colors hover:bg-error-bg hover:text-error
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      {aberto && (
        <div className="space-y-5 border-t border-border p-4">
          {editando ? (
            <SetorForm
              inicial={setor}
              onSalvar={onSalvarEdicao}
              onCancelar={onCancelarEdicao}
              carregando={salvandoEdicao}
              rotuloSalvar="Salvar setor"
            />
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  {setor.descricao_ambiente && (
                    <div>
                      <h4 className="mb-1 font-medium text-content">Ambiente</h4>
                      <p className="whitespace-pre-wrap text-content-secondary">
                        {setor.descricao_ambiente}
                      </p>
                    </div>
                  )}
                  <SetorMedicoes setor={setor} />
                </div>
                {editavel && (
                  <button
                    type="button"
                    onClick={onEditar}
                    aria-label={`Editar dados do setor ${setor.nome}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg
                      text-content-secondary transition-colors hover:bg-accent hover:text-primary
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
              <CargosSetor chamadoId={chamadoId} setorId={setor.id} cargos={setor.cargos} />
              <FotosSetor chamadoId={chamadoId} setorId={setor.id} fotos={setor.fotos} />
            </>
          )}
        </div>
      )}
    </section>
  )
}

export default function ExecucaoVisitaPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const setorParaAbrir = (location.state as { setorAberto?: string } | null)?.setorAberto
  const { data: chamado, isLoading: carregandoChamado } = useChamado(id)
  const { data: setores = [], isLoading, isError, refetch } = useSetores(id)
  const criarSetor = useCriarSetor(id)
  const atualizarSetor = useAtualizarSetor(id)
  const removerSetor = useRemoverSetor(id)

  // Ao voltar do editor de cargo, reabre o setor em que se estava.
  const [abertos, setAbertos] = useState<Set<string>>(
    () => new Set(setorParaAbrir ? [setorParaAbrir] : []),
  )
  const [novoAberto, setNovoAberto] = useState(false)
  const [editandoSetor, setEditandoSetor] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [removendo, setRemovendo] = useState<SetorDetalhe | null>(null)

  function alternar(setorId: string) {
    setAbertos((atual) => {
      const novo = new Set(atual)
      if (novo.has(setorId)) novo.delete(setorId)
      else novo.add(setorId)
      return novo
    })
  }

  async function adicionarSetor(campos: SetorCampos) {
    setErro(null)
    try {
      const criado = await criarSetor.mutateAsync({ chamado_id: id, ordem: setores.length, ...campos })
      setNovoAberto(false)
      // Abre o setor recém-criado: o próximo passo é cadastrar os cargos dele.
      if (criado?.id) setAbertos((a) => new Set(a).add(criado.id))
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível adicionar o setor.'))
    }
  }

  async function salvarEdicaoSetor(setorId: string, campos: SetorCampos) {
    setErro(null)
    try {
      await atualizarSetor.mutateAsync({ id: setorId, body: campos })
      setEditandoSetor(null)
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível salvar o setor.'))
    }
  }

  async function confirmarRemocao() {
    if (!removendo) return
    try {
      await removerSetor.mutateAsync(removendo.id)
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível remover o setor.'))
    } finally {
      setRemovendo(null)
    }
  }

  if (carregandoChamado || isLoading) {
    return (
      <PageWrapper titulo="Visita">
        <div className="h-64 animate-pulse rounded-xl border border-border bg-surface" />
      </PageWrapper>
    )
  }

  if (isError || !chamado) {
    return (
      <PageWrapper titulo="Visita">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-12 text-center">
          <AlertCircle className="h-8 w-8 text-error" aria-hidden />
          <p className="font-medium text-content">Não foi possível carregar a visita.</p>
          <Button variante="secondary" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      </PageWrapper>
    )
  }

  // Só faz sentido registrar dados numa visita em andamento — o backend recusa
  // o resto com 409 VISITA_NAO_EDITAVEL.
  const editavel = chamado.status === 'EM_ANDAMENTO'
  const totalCargos = setores.reduce((soma, s) => soma + s.cargos.length, 0)
  // O backend exige ≥1 setor e ≥1 cargo para finalizar.
  const podeFinalizar = setores.length > 0 && totalCargos > 0

  return (
    <PageWrapper
      titulo={chamado.cliente_razao_social ?? 'Visita'}
      descricao={`Chamado #${chamado.numero_chamado} · iniciada ${dataHora(chamado.dt_inicio_visita).toLowerCase()}`}
    >
      <Link
        to="/visitas"
        className="mb-4 inline-flex min-h-touch items-center gap-1.5 font-medium text-primary
          underline-offset-2 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Minhas visitas
      </Link>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TipoVisitaBadge tipo={chamado.tipo_visita} />
        <span className="text-sm text-content-secondary">
          {setores.length} {setores.length === 1 ? 'setor' : 'setores'} · {totalCargos}{' '}
          {totalCargos === 1 ? 'cargo' : 'cargos'}
        </span>
      </div>

      {!editavel && (
        <p className="mb-4 flex items-start gap-2 rounded-lg bg-warning-bg p-3 text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Esta visita não está em andamento, então os dados não podem ser alterados.
        </p>
      )}

      {erro && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-error-bg p-3 text-error"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{erro}</span>
        </div>
      )}

      <div className="space-y-4">
        {setores.length === 0 && !novoAberto && (
          <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
            <p className="text-lg font-medium text-content">Nenhum setor registrado.</p>
            <p className="mt-1 text-content-secondary">
              Comece adicionando o primeiro setor ou ambiente visitado.
            </p>
          </div>
        )}

        {setores.map((setor, i) => (
          <CardSetor
            key={setor.id}
            setor={setor}
            chamadoId={id}
            indice={i}
            aberto={abertos.has(setor.id)}
            editavel={editavel}
            editando={editandoSetor === setor.id}
            salvandoEdicao={atualizarSetor.isPending}
            onAlternar={() => alternar(setor.id)}
            onRemover={() => setRemovendo(setor)}
            onEditar={() => {
              setAbertos((a) => new Set(a).add(setor.id))
              setEditandoSetor(setor.id)
            }}
            onCancelarEdicao={() => setEditandoSetor(null)}
            onSalvarEdicao={(campos) => salvarEdicaoSetor(setor.id, campos)}
          />
        ))}

        {editavel && !novoAberto && (
          <Button variante="secondary" className="w-full" onClick={() => setNovoAberto(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Adicionar setor
          </Button>
        )}

        {novoAberto && (
          <section className="space-y-3 rounded-xl border border-primary/30 bg-surface p-4 shadow-card">
            <h2 className="font-semibold tracking-tightish text-content">Novo setor</h2>
            <SetorForm
              onSalvar={adicionarSetor}
              onCancelar={() => setNovoAberto(false)}
              carregando={criarSetor.isPending}
              rotuloSalvar="Adicionar setor"
            />
          </section>
        )}
      </div>

      {editavel && (
        <div className="mt-6 rounded-xl border border-border bg-surface p-4 shadow-card">
          <h2 className="font-semibold tracking-tightish text-content">Encerrar a visita</h2>
          <p className="mt-1 text-content-secondary">
            {podeFinalizar
              ? 'Confira os dados com o cliente e colha as assinaturas.'
              : 'Registre pelo menos um setor com um cargo antes de encerrar.'}
          </p>
          {podeFinalizar ? (
            <Link to={`/visitas/${id}/conferencia`}>
              <Button variante="action" className="mt-4 w-full sm:w-auto">
                <ClipboardCheck className="h-4 w-4" aria-hidden />
                Conferir e assinar
              </Button>
            </Link>
          ) : (
            <>
              <Button variante="action" className="mt-4 w-full sm:w-auto" disabled>
                <ClipboardCheck className="h-4 w-4" aria-hidden />
                Conferir e assinar
              </Button>
              <p className="mt-2 text-sm text-content-secondary">
                Faltando: {setores.length === 0 ? 'um setor' : 'um cargo em algum setor'}.
              </p>
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        aberto={removendo !== null}
        titulo={`Remover o setor "${removendo?.nome}"?`}
        descricao={
          (removendo?.cargos.length ?? 0) + (removendo?.fotos.length ?? 0) > 0
            ? `Os ${removendo?.cargos.length ?? 0} cargo(s) e ${removendo?.fotos.length ?? 0} foto(s) deste setor também serão removidos. Esta ação não pode ser desfeita.`
            : 'Esta ação não pode ser desfeita.'
        }
        rotuloConfirmar="Remover setor"
        destrutivo
        carregando={removerSetor.isPending}
        onConfirmar={() => void confirmarRemocao()}
        onCancelar={() => setRemovendo(null)}
      />
    </PageWrapper>
  )
}
