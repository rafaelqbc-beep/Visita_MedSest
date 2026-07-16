import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { AlertCircle, ArrowLeft, Ban, Lock, MapPin } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { StatusBadge } from '@/components/StatusBadge'
import { TipoVisitaBadge } from '@/components/TipoVisitaBadge'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/hooks/useAuth'
import {
  useAtualizarChamado,
  useCancelarChamado,
  useChamado,
  useTecnicosExternos,
  useTecnicosInternos,
} from '@/hooks/useChamados'
import { ROTULO_TIPO_VISITA } from '@/lib/coresGrafico'
import { data as fmtData, dataHora } from '@/lib/formato'
import { mensagemDeErro } from '@/services/api'
import type { TipoVisita } from '@/types'

const TIPOS: TipoVisita[] = ['NOVO_CLIENTE', 'RENOVACAO', 'VISITA_TECNICA']

interface FormEditar {
  tipo_visita: TipoVisita
  tecnico_externo_id: string
  tecnico_interno_id: string
  data_proposta: string
  recomendacoes: string
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-content-secondary">{rotulo}</dt>
      <dd className="mt-0.5 text-sm text-content">{valor}</dd>
    </div>
  )
}

export default function ChamadoDetalhePage() {
  const { id = '' } = useParams()
  const { usuario } = useAuth()
  const { data: chamado, isLoading, isError } = useChamado(id)
  const atualizar = useAtualizarChamado(id)
  const cancelar = useCancelarChamado(id)
  const { data: externos = [], isSuccess: externosProntos } = useTecnicosExternos()
  const { data: internos = [], isSuccess: internosProntos } = useTecnicosInternos()

  const [erroApi, setErroApi] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)
  const [confirmarCancelar, setConfirmarCancelar] = useState(false)

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<FormEditar>()

  /**
   * Só preenche o formulário depois que as listas de técnicos chegarem.
   *
   * Os `<select>` são não-controlados: o valor é escrito no DOM. Se o `reset`
   * rodar antes de os `<option>` existirem, o navegador não acha a opção e cai
   * na primeira ("Sem técnico") — a tela mostraria o chamado sem técnico, e o
   * próximo "Salvar" mandaria `tecnico_interno_id: null`, apagando a atribuição
   * do round-robin. As queries têm cache de 5min, então normalmente já chegaram;
   * quem paga o preço é o primeiro acesso, justo o do link vindo do e-mail.
   */
  const opcoesProntas = externosProntos && internosProntos

  useEffect(() => {
    if (!chamado || !opcoesProntas) return
    reset({
      tipo_visita: chamado.tipo_visita,
      tecnico_externo_id: chamado.tecnico_externo_id ?? '',
      tecnico_interno_id: chamado.tecnico_interno_id ?? '',
      data_proposta: chamado.data_proposta ?? '',
      recomendacoes: chamado.recomendacoes ?? '',
    })
  }, [chamado, opcoesProntas, reset])

  if (isLoading) {
    return (
      <PageWrapper titulo="Chamado">
        <div className="h-64 animate-pulse rounded-xl border border-border bg-surface" />
      </PageWrapper>
    )
  }

  if (isError || !chamado) {
    return (
      <PageWrapper titulo="Chamado">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-12 text-center">
          <AlertCircle className="h-8 w-8 text-error" aria-hidden />
          <p className="font-medium text-content">Chamado não encontrado.</p>
          <Link to="/chamados">
            <Button variante="secondary">Voltar para os chamados</Button>
          </Link>
        </div>
      </PageWrapper>
    )
  }

  // O backend trava chamado FINALIZADO/CANCELADO: o PUT só aceita trocar
  // técnico; qualquer outro campo devolve 409 CHAMADO_TRAVADO. A UI desabilita
  // os campos e explica — o usuário não pode descobrir isso por um erro.
  const travado = chamado.status === 'FINALIZADO' || chamado.status === 'CANCELADO'

  // Cancelar PENDENTE/EM_ANDAMENTO é rotina de agenda. Anular um FINALIZADO
  // desfaz um fato assinado pelo cliente: só ADMIN, e com motivo. O botão nem
  // aparece para o gestor — melhor do que deixar ele tentar e tomar 403.
  const anulacao = chamado.status === 'FINALIZADO'
  const podeCancelar =
    chamado.status !== 'CANCELADO' && (!anulacao || usuario?.role === 'ADMIN')

  async function onSubmit(form: FormEditar) {
    setErroApi(null)
    setSalvo(false)
    try {
      await atualizar.mutateAsync(
        travado
          ? // Travado: só os técnicos vão no payload.
            {
              tecnico_externo_id: form.tecnico_externo_id || null,
              tecnico_interno_id: form.tecnico_interno_id || null,
            }
          : {
              tipo_visita: form.tipo_visita,
              tecnico_externo_id: form.tecnico_externo_id || null,
              tecnico_interno_id: form.tecnico_interno_id || null,
              data_proposta: form.data_proposta || null,
              recomendacoes: form.recomendacoes || null,
            },
      )
      setSalvo(true)
    } catch (erro) {
      setErroApi(mensagemDeErro(erro, 'Não foi possível salvar as alterações.'))
    }
  }

  async function aoCancelar(motivo?: string) {
    setErroApi(null)
    try {
      await cancelar.mutateAsync(motivo)
      setConfirmarCancelar(false)
    } catch (erro) {
      setConfirmarCancelar(false)
      setErroApi(mensagemDeErro(erro, 'Não foi possível cancelar o chamado.'))
    }
  }

  return (
    <PageWrapper
      titulo={`Chamado #${chamado.numero_chamado}`}
      descricao={chamado.cliente_razao_social ?? undefined}
      acoes={
        podeCancelar && (
          <Button variante="destructive" onClick={() => setConfirmarCancelar(true)}>
            <Ban className="h-4 w-4" aria-hidden />
            {anulacao ? 'Anular visita' : 'Cancelar chamado'}
          </Button>
        )
      }
    >
      <Link
        to="/chamados"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary
          underline-offset-2 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Voltar para os chamados
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ---------- Situação ---------- */}
        <section className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-card">
          <div>
            <h2 className="mb-2 font-semibold tracking-tightish text-content">Situação</h2>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={chamado.status} />
              <TipoVisitaBadge tipo={chamado.tipo_visita} />
            </div>
          </div>

          <dl className="grid gap-3">
            <Campo rotulo="Abertura" valor={dataHora(chamado.dt_abertura)} />
            <Campo rotulo="Data proposta" valor={fmtData(chamado.data_proposta)} />
            {chamado.data_visita_alterada && (
              <Campo
                rotulo="Reagendada pelo técnico"
                valor={fmtData(chamado.data_visita_alterada)}
              />
            )}
            <Campo rotulo="Início da visita" valor={dataHora(chamado.dt_inicio_visita)} />
            <Campo rotulo="Fim da visita" valor={dataHora(chamado.dt_fim_visita)} />
            {chamado.status === 'FINALIZADO' && (
              <>
                <Campo
                  rotulo="Assinado por"
                  valor={
                    chamado.assinatura_cliente_nome
                      ? `${chamado.assinatura_cliente_nome} · ${chamado.assinatura_cliente_cpf ?? ''}`
                      : '—'
                  }
                />
                <Campo rotulo="Exportado em" valor={dataHora(chamado.dt_exportacao_word)} />
              </>
            )}
          </dl>

          {chamado.geoloc_latitude != null && chamado.geoloc_longitude != null && (
            <p className="flex items-center gap-1.5 text-xs text-content-secondary">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Início em {Number(chamado.geoloc_latitude).toFixed(5)},{' '}
              {Number(chamado.geoloc_longitude).toFixed(5)}
            </p>
          )}

          {/* Cancelado: quem, quando e por quê — o gestor olhando a lista vai
              querer saber, e é o rastro de auditoria da anulação. */}
          {chamado.status === 'CANCELADO' && (
            <div className="rounded-lg border border-red-200 bg-error-bg p-3">
              <p className="text-xs font-medium text-error">Cancelamento</p>
              <dl className="mt-2 grid gap-2">
                <Campo rotulo="Por" valor={chamado.cancelado_por_nome ?? '—'} />
                <Campo rotulo="Quando" valor={dataHora(chamado.dt_cancelamento)} />
              </dl>
              {chamado.motivo_cancelamento ? (
                <p className="mt-2 whitespace-pre-wrap text-sm text-content">
                  {chamado.motivo_cancelamento}
                </p>
              ) : (
                <p className="mt-2 text-sm italic text-content-secondary">
                  Sem motivo registrado.
                </p>
              )}
            </div>
          )}
        </section>

        {/* ---------- Edição ---------- */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-card lg:col-span-2"
        >
          <h2 className="font-semibold tracking-tightish text-content">Dados do chamado</h2>

          {travado && (
            <p className="flex items-start gap-2 rounded-lg bg-warning-bg p-3 text-sm text-amber-800">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {chamado.status === 'FINALIZADO'
                ? 'Visita finalizada e assinada pelo cliente. Os dados não podem mais ser alterados — só o remanejamento de técnicos.'
                : 'Chamado cancelado. Só o remanejamento de técnicos continua disponível.'}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Tipo de visita" htmlFor="tipo_visita">
              <Select id="tipo_visita" disabled={travado} {...register('tipo_visita')}>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {ROTULO_TIPO_VISITA[t]}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Data proposta" htmlFor="data_proposta">
              <Input id="data_proposta" type="date" disabled={travado} {...register('data_proposta')} />
            </FormField>

            {/* Os técnicos seguem editáveis mesmo travado: o gestor remaneja
                a qualquer momento (regra do backend). */}
            <FormField label="Técnico externo" htmlFor="tecnico_externo_id">
              <Select id="tecnico_externo_id" {...register('tecnico_externo_id')}>
                <option value="">Sem técnico</option>
                {externos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Técnico interno" htmlFor="tecnico_interno_id">
              <Select id="tecnico_interno_id" {...register('tecnico_interno_id')}>
                <option value="">Sem técnico</option>
                {internos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField label="Recomendações" htmlFor="recomendacoes">
            <Textarea id="recomendacoes" disabled={travado} {...register('recomendacoes')} />
          </FormField>

          {erroApi && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-error-bg p-3 text-sm text-error"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{erroApi}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            {salvo && !isDirty && (
              <span role="status" className="text-sm text-success">
                Alterações salvas.
              </span>
            )}
            <Button type="submit" carregando={atualizar.isPending} disabled={!isDirty}>
              Salvar alterações
            </Button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        aberto={confirmarCancelar}
        titulo={
          anulacao
            ? `Anular a visita do chamado #${chamado.numero_chamado}?`
            : `Cancelar o chamado #${chamado.numero_chamado}?`
        }
        descricao={
          anulacao
            ? `Esta visita foi conferida e assinada por ${chamado.assinatura_cliente_nome ?? 'o cliente'} no local. Anulá-la desfaz um registro assinado e remove os dados do técnico interno. Esta ação não pode ser desfeita.`
            : chamado.status === 'EM_ANDAMENTO'
              ? 'A visita já foi iniciada pelo técnico. O cancelamento interrompe o atendimento e não pode ser desfeito.'
              : 'O chamado sai da fila do técnico externo. Esta ação não pode ser desfeita.'
        }
        motivo={{
          label: anulacao ? 'Motivo da anulação' : 'Motivo do cancelamento',
          // Rotina de agenda não precisa de justificativa; anular um registro
          // assinado precisa.
          obrigatorio: anulacao,
          placeholder: anulacao
            ? 'Ex.: técnico visitou a empresa errada; chamado duplicado.'
            : 'Ex.: cliente desmarcou por telefone.',
        }}
        rotuloConfirmar={anulacao ? 'Anular visita' : 'Cancelar chamado'}
        destrutivo
        carregando={cancelar.isPending}
        onConfirmar={(motivo) => void aoCancelar(motivo)}
        onCancelar={() => setConfirmarCancelar(false)}
      />
    </PageWrapper>
  )
}
