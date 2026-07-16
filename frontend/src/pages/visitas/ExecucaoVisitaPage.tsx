import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ClipboardCheck,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { TipoVisitaBadge } from '@/components/TipoVisitaBadge'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { useChamado } from '@/hooks/useChamados'
import { useCriarSetor, useRemoverSetor, useSetores } from '@/hooks/useVisita'
import { dataHora } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { mensagemDeErro } from '@/services/api'
import { CargosSetor } from '@/pages/visitas/CargosSetor'
import { FotosSetor } from '@/pages/visitas/FotosSetor'
import type { SetorDetalhe } from '@/types/visita'

function CardSetor({
  setor,
  chamadoId,
  indice,
  aberto,
  onAlternar,
  onRemover,
}: {
  setor: SetorDetalhe
  chamadoId: string
  indice: number
  aberto: boolean
  onAlternar: () => void
  onRemover: () => void
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
      </div>

      {aberto && (
        <div className="space-y-5 border-t border-border p-4">
          {setor.descricao_ambiente && (
            <div>
              <h4 className="mb-1 font-medium text-content">Ambiente</h4>
              <p className="whitespace-pre-wrap text-content-secondary">
                {setor.descricao_ambiente}
              </p>
            </div>
          )}
          <CargosSetor chamadoId={chamadoId} setorId={setor.id} cargos={setor.cargos} />
          <FotosSetor chamadoId={chamadoId} setorId={setor.id} fotos={setor.fotos} />
        </div>
      )}
    </section>
  )
}

export default function ExecucaoVisitaPage() {
  const { id = '' } = useParams()
  const { data: chamado, isLoading: carregandoChamado } = useChamado(id)
  const { data: setores = [], isLoading, isError, refetch } = useSetores(id)
  const criarSetor = useCriarSetor(id)
  const removerSetor = useRemoverSetor(id)

  const [abertos, setAbertos] = useState<Set<string>>(new Set())
  const [novoAberto, setNovoAberto] = useState(false)
  const [nome, setNome] = useState('')
  const [ambiente, setAmbiente] = useState('')
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

  async function adicionarSetor() {
    if (!nome.trim()) {
      setErro('Informe o nome do setor.')
      return
    }
    setErro(null)
    try {
      const criado = await criarSetor.mutateAsync({
        chamado_id: id,
        nome: nome.trim(),
        descricao_ambiente: ambiente.trim() || null,
        ordem: setores.length,
      })
      setNome('')
      setAmbiente('')
      setNovoAberto(false)
      // Abre o setor recém-criado: o próximo passo é cadastrar os cargos dele.
      if (criado?.id) setAbertos((a) => new Set(a).add(criado.id))
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível adicionar o setor.'))
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
            onAlternar={() => alternar(setor.id)}
            onRemover={() => setRemovendo(setor)}
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
            <div className="flex items-center justify-between">
              <h2 className="font-semibold tracking-tightish text-content">Novo setor</h2>
              <button
                type="button"
                onClick={() => {
                  setNovoAberto(false)
                  setNome('')
                  setAmbiente('')
                  setErro(null)
                }}
                aria-label="Fechar novo setor"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-content-secondary
                  hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <FormField label="Nome do setor" htmlFor="setor-nome">
              <Input
                id="setor-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Produção, Almoxarifado, Recepção"
                erro={!!erro && !nome.trim()}
                autoFocus
              />
            </FormField>

            <FormField label="Descrição do ambiente" htmlFor="setor-ambiente">
              <Textarea
                id="setor-ambiente"
                rows={3}
                value={ambiente}
                onChange={(e) => setAmbiente(e.target.value)}
                placeholder="Condições do local: ruído, iluminação, ventilação, riscos (opcional)."
              />
            </FormField>

            <Button
              onClick={() => void adicionarSetor()}
              carregando={criarSetor.isPending}
              className="w-full"
            >
              Adicionar setor
            </Button>
          </section>
        )}
      </div>

      {/* Finalizar entra na sessão #15, junto das assinaturas. */}
      {editavel && (
        <div className="mt-6 rounded-xl border border-border bg-surface p-4 shadow-card">
          <h2 className="font-semibold tracking-tightish text-content">Encerrar a visita</h2>
          <p className="mt-1 text-content-secondary">
            {podeFinalizar
              ? 'Confira os dados com o cliente e colha as assinaturas.'
              : 'Registre pelo menos um setor com um cargo antes de encerrar.'}
          </p>
          <Button variante="action" className="mt-4 w-full sm:w-auto" disabled={!podeFinalizar}>
            <ClipboardCheck className="h-4 w-4" aria-hidden />
            Conferir e assinar
          </Button>
          {!podeFinalizar && (
            <p className="mt-2 text-sm text-content-secondary">
              Faltando: {setores.length === 0 ? 'um setor' : 'um cargo em algum setor'}.
            </p>
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
