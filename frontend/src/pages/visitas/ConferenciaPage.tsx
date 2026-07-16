import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Pencil,
  ShieldCheck,
} from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { CanvasAssinatura, type CanvasAssinaturaRef } from '@/components/CanvasAssinatura'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { TipoVisitaBadge } from '@/components/TipoVisitaBadge'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'
import { useChamado } from '@/hooks/useChamados'
import { useGeolocalizacao } from '@/hooks/useGeolocalizacao'
import {
  useAssinarCliente,
  useAssinarTecnico,
  useFinalizarVisita,
  useSetores,
} from '@/hooks/useVisita'
import { mascararCpf, validarCpf } from '@/lib/cpf'
import { cn } from '@/lib/utils'
import { mensagemDeErro } from '@/services/api'
import { urlDaFoto } from '@/services/visitaService'

/** Passo concluído ganha um traço verde — o técnico vê o que falta. */
function Passo({ feito, children }: { feito: boolean; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-sm">
      <span
        aria-hidden
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
          feito ? 'bg-brand-green text-white' : 'border border-border bg-white',
        )}
      >
        {feito && <Check className="h-3 w-3" aria-hidden />}
      </span>
      <span className={feito ? 'text-content' : 'text-content-secondary'}>{children}</span>
    </span>
  )
}

export default function ConferenciaPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const { data: chamado, isLoading } = useChamado(id)
  const { data: setores = [] } = useSetores(id)
  const { obter } = useGeolocalizacao()

  const assinarCliente = useAssinarCliente(id)
  const assinarTecnico = useAssinarTecnico(id)
  const finalizar = useFinalizarVisita(id)

  const canvasCliente = useRef<CanvasAssinaturaRef>(null)
  const canvasTecnico = useRef<CanvasAssinaturaRef>(null)

  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [erroNome, setErroNome] = useState<string | null>(null)
  const [erroCpf, setErroCpf] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [temTracoCliente, setTemTracoCliente] = useState(false)
  const [temTracoTecnico, setTemTracoTecnico] = useState(false)

  if (isLoading || !chamado) {
    return (
      <PageWrapper titulo="Conferência">
        <div className="h-64 animate-pulse rounded-xl border border-border bg-surface" />
      </PageWrapper>
    )
  }

  const clienteAssinou = Boolean(chamado.assinatura_cliente_caminho)
  const tecnicoAssinou = Boolean(chamado.assinatura_tecnico_caminho)
  const podeFinalizar = clienteAssinou && tecnicoAssinou

  async function salvarAssinaturaCliente() {
    setErro(null)
    setErroNome(null)
    setErroCpf(null)

    let invalido = false
    if (!nome.trim()) {
      setErroNome('Informe o nome de quem está assinando.')
      invalido = true
    }
    // Valida aqui também: o técnico está com o cliente do lado e não pode
    // esperar o servidor para descobrir que o CPF está errado.
    if (!validarCpf(cpf)) {
      setErroCpf('CPF inválido.')
      invalido = true
    }
    if (invalido) return

    const arquivo = await canvasCliente.current?.paraArquivo('assinatura-cliente.png')
    if (!arquivo) {
      setErro('O cliente precisa assinar no quadro antes de confirmar.')
      return
    }

    try {
      await assinarCliente.mutateAsync({ arquivo, nome: nome.trim(), cpf })
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível registrar a assinatura do cliente.'))
    }
  }

  async function salvarAssinaturaTecnico() {
    setErro(null)
    const arquivo = await canvasTecnico.current?.paraArquivo('assinatura-tecnico.png')
    if (!arquivo) {
      setErro('Assine no quadro antes de confirmar.')
      return
    }
    try {
      await assinarTecnico.mutateAsync(arquivo)
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível registrar a sua assinatura.'))
    }
  }

  async function confirmarFinalizacao() {
    setErro(null)
    try {
      const geo = await obter()
      await finalizar.mutateAsync(geo)
      setConfirmando(false)
      // O trabalho acabou: volta para a fila. O técnico ainda consegue abrir
      // esta visita pela URL (o escopo dele não filtra por status), mas em
      // modo leitura — ficar na tela de assinatura já assinada não faz sentido.
      navigate('/visitas', { replace: true, state: { visitaFinalizada: true } })
    } catch (e) {
      setConfirmando(false)
      setErro(mensagemDeErro(e, 'Não foi possível finalizar a visita.'))
    }
  }

  const totalCargos = setores.reduce((s, setor) => s + setor.cargos.length, 0)
  const totalFotos = setores.reduce((s, setor) => s + setor.fotos.length, 0)

  return (
    <PageWrapper
      titulo="Conferência e assinaturas"
      descricao={`${chamado.cliente_razao_social ?? ''} · Chamado #${chamado.numero_chamado}`}
    >
      <Link
        to={`/visitas/${id}`}
        className="mb-4 inline-flex min-h-touch items-center gap-1.5 font-medium text-primary
          underline-offset-2 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Voltar e corrigir
      </Link>

      {erro && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-error-bg p-3 text-error"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{erro}</span>
        </div>
      )}

      {/* ---------- 1. Revisão com o cliente ---------- */}
      <section className="mb-6 rounded-xl border border-border bg-surface p-4 shadow-card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tightish text-content">
            Confira os dados com o cliente
          </h2>
          <TipoVisitaBadge tipo={chamado.tipo_visita} />
        </div>
        <p className="mb-4 text-content-secondary">
          Leia com o cliente o que foi registrado. Se algo estiver errado, volte e corrija{' '}
          <strong>antes</strong> de assinar.
        </p>

        <p className="mb-4 text-sm text-content-secondary">
          {setores.length} {setores.length === 1 ? 'setor' : 'setores'} · {totalCargos}{' '}
          {totalCargos === 1 ? 'cargo' : 'cargos'} · {totalFotos}{' '}
          {totalFotos === 1 ? 'foto' : 'fotos'}
        </p>

        <ul className="space-y-4">
          {setores.map((setor, i) => (
            <li key={setor.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-content">
                    {i + 1}. {setor.nome}
                  </h3>
                  {setor.descricao_ambiente && (
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-content-secondary">
                      {setor.descricao_ambiente}
                    </p>
                  )}
                </div>
                <Link
                  to={`/visitas/${id}`}
                  aria-label={`Corrigir o setor ${setor.nome}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg
                    text-content-secondary transition-colors hover:bg-accent hover:text-primary"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </Link>
              </div>

              {setor.cargos.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {setor.cargos.map((cargo) => (
                    <li key={cargo.id} className="text-sm text-content">
                      • {cargo.nome_cargo}
                      {cargo.descricao_funcao && (
                        <span className="text-content-secondary"> — {cargo.descricao_funcao}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {setor.fotos.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {setor.fotos.map((foto) => (
                    <li key={foto.id}>
                      <img
                        src={urlDaFoto(foto.caminho_arquivo)}
                        alt={foto.descricao || 'Foto do setor'}
                        loading="lazy"
                        className="h-16 w-20 rounded border border-border object-cover"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- 2. Assinatura do cliente ---------- */}
      <section className="mb-6 rounded-xl border border-border bg-surface p-4 shadow-card">
        <h2 className="mb-1 text-lg font-semibold tracking-tightish text-content">
          Assinatura do cliente
        </h2>

        {clienteAssinou ? (
          <div className="rounded-lg border border-green-200 bg-success-bg p-4">
            <p className="flex items-center gap-2 font-medium text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              Assinado por {chamado.assinatura_cliente_nome}
            </p>
            <p className="mt-1 text-sm text-content-secondary">
              CPF {chamado.assinatura_cliente_cpf}
            </p>
            {chamado.assinatura_cliente_caminho && (
              <img
                src={urlDaFoto(chamado.assinatura_cliente_caminho)}
                alt={`Assinatura de ${chamado.assinatura_cliente_nome}`}
                className="mt-2 h-16 bg-white"
              />
            )}
            <p className="mt-3 text-sm text-content-secondary">
              Assinou a pessoa errada ou o traço saiu ruim?{' '}
              <button
                type="button"
                onClick={() => {
                  canvasCliente.current?.limpar()
                  setNome(chamado.assinatura_cliente_nome ?? '')
                  setCpf(chamado.assinatura_cliente_cpf ?? '')
                }}
                className="font-medium text-primary underline underline-offset-2"
              >
                Assinar de novo
              </button>
            </p>
          </div>
        ) : (
          <p className="mb-4 text-content-secondary">
            O cliente confirma que as informações acima estão corretas.
          </p>
        )}

        <div className={cn('mt-4 space-y-4', clienteAssinou && 'hidden')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nome de quem assina" htmlFor="assinatura-nome" erro={erroNome ?? undefined}>
              <Input
                id="assinatura-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome completo"
                erro={!!erroNome}
                autoComplete="off"
              />
            </FormField>
            <FormField label="CPF" htmlFor="assinatura-cpf" erro={erroCpf ?? undefined}>
              <Input
                id="assinatura-cpf"
                value={cpf}
                onChange={(e) => setCpf(mascararCpf(e.target.value))}
                placeholder="000.000.000-00"
                // Teclado numérico no tablet
                inputMode="numeric"
                erro={!!erroCpf}
                autoComplete="off"
              />
            </FormField>
          </div>

          <CanvasAssinatura
            ref={canvasCliente}
            rotulo="Quadro para o cliente assinar"
            onMudar={setTemTracoCliente}
          />

          <Button
            variante="action"
            className="w-full"
            onClick={() => void salvarAssinaturaCliente()}
            carregando={assinarCliente.isPending}
            disabled={!temTracoCliente}
          >
            Confirmar assinatura do cliente
          </Button>
        </div>
      </section>

      {/* ---------- 3. Assinatura do técnico ---------- */}
      <section className="mb-6 rounded-xl border border-border bg-surface p-4 shadow-card">
        <h2 className="mb-1 text-lg font-semibold tracking-tightish text-content">
          Sua assinatura
        </h2>

        {tecnicoAssinou ? (
          <div className="rounded-lg border border-green-200 bg-success-bg p-4">
            <p className="flex items-center gap-2 font-medium text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              Assinado por {usuario?.nome}
            </p>
            {chamado.assinatura_tecnico_caminho && (
              <img
                src={urlDaFoto(chamado.assinatura_tecnico_caminho)}
                alt="Sua assinatura"
                className="mt-2 h-16 bg-white"
              />
            )}
            <p className="mt-3 text-sm text-content-secondary">
              <button
                type="button"
                onClick={() => canvasTecnico.current?.limpar()}
                className="font-medium text-primary underline underline-offset-2"
              >
                Assinar de novo
              </button>
            </p>
          </div>
        ) : (
          <p className="mb-4 text-content-secondary">
            Você, {usuario?.nome}, confirma que realizou esta visita.
          </p>
        )}

        <div className={cn('mt-4 space-y-4', tecnicoAssinou && 'hidden')}>
          <CanvasAssinatura
            ref={canvasTecnico}
            rotulo="Quadro para o técnico assinar"
            onMudar={setTemTracoTecnico}
          />
          <Button
            variante="action"
            className="w-full"
            onClick={() => void salvarAssinaturaTecnico()}
            carregando={assinarTecnico.isPending}
            disabled={!temTracoTecnico}
          >
            Confirmar minha assinatura
          </Button>
        </div>
      </section>

      {/* ---------- 4. Finalizar ---------- */}
      <section className="rounded-xl border border-border bg-surface p-4 shadow-card">
        <h2 className="mb-3 text-lg font-semibold tracking-tightish text-content">
          Finalizar a visita
        </h2>

        <div className="mb-4 space-y-2">
          <Passo feito={setores.length > 0}>Pelo menos um setor registrado</Passo>
          <Passo feito={totalCargos > 0}>Pelo menos um cargo registrado</Passo>
          <Passo feito={clienteAssinou}>Cliente assinou</Passo>
          <Passo feito={tecnicoAssinou}>Você assinou</Passo>
        </div>

        <Button
          variante="action"
          className="w-full"
          disabled={!podeFinalizar}
          onClick={() => setConfirmando(true)}
        >
          <ShieldCheck className="h-4 w-4" aria-hidden />
          Finalizar visita
        </Button>

        {!podeFinalizar && (
          <p className="mt-2 text-center text-sm text-content-secondary">
            Complete os passos acima para finalizar.
          </p>
        )}
      </section>

      <ConfirmDialog
        aberto={confirmando}
        titulo="Finalizar a visita?"
        descricao={
          'Os dados ficam disponíveis para a equipe técnica elaborar o PGR, e o cliente recebe ' +
          'uma cópia do relatório assinado. Depois disso a visita não pode mais ser editada.'
        }
        rotuloConfirmar="Finalizar visita"
        carregando={finalizar.isPending}
        onConfirmar={() => void confirmarFinalizacao()}
        onCancelar={() => setConfirmando(false)}
      />
    </PageWrapper>
  )
}
