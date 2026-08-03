import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { AcordeaoSelecao } from '@/components/AcordeaoSelecao'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { useChamado } from '@/hooks/useChamados'
import { useCatalogo } from '@/hooks/useCatalogo'
import { useAtualizarCargo, useCriarCargo, useSetores } from '@/hooks/useVisita'
import { cn } from '@/lib/utils'
import { mensagemDeErro } from '@/services/api'
import type { CargoCampos } from '@/types/visita'

/** Segmento Sim/Não — a ausência declarada é uma informação, diferente de "em branco". */
function SegmentoSimNao({
  valor,
  onChange,
  idBase,
}: {
  valor: boolean | null
  onChange: (v: boolean) => void
  idBase: string
}) {
  return (
    <div className="inline-flex rounded-lg border border-border p-1" role="group" aria-labelledby={idBase}>
      {[
        { rotulo: 'Sim', v: true },
        { rotulo: 'Não', v: false },
      ].map(({ rotulo, v }) => (
        <button
          key={rotulo}
          type="button"
          aria-pressed={valor === v}
          onClick={() => onChange(v)}
          className={cn(
            'min-h-touch min-w-[5rem] rounded-md px-4 text-sm font-medium transition-colors',
            valor === v
              ? v
                ? 'bg-primary text-white'
                : 'bg-content-secondary text-white'
              : 'text-content-secondary hover:bg-accent',
          )}
        >
          {rotulo}
        </button>
      ))}
    </div>
  )
}

export default function CargoEditorPage() {
  const { id = '', setorId = '', cargoId } = useParams()
  const navigate = useNavigate()
  const { data: chamado, isLoading: carregandoChamado } = useChamado(id)
  const { data: setores = [], isLoading: carregandoSetores } = useSetores(id)
  const { data: catalogo, isLoading: carregandoCatalogo } = useCatalogo()

  const criar = useCriarCargo(id)
  const atualizar = useAtualizarCargo(id)

  const setor = setores.find((s) => s.id === setorId)
  const cargo = cargoId ? setor?.cargos.find((c) => c.id === cargoId) : undefined
  const editando = Boolean(cargoId)

  // Estado do formulário — inicializado do cargo (edição) só uma vez.
  const [nome, setNome] = useState(cargo?.nome_cargo ?? '')
  const [descricao, setDescricao] = useState(cargo?.descricao_funcao ?? '')
  const [numTrab, setNumTrab] = useState(
    cargo?.num_trabalhadores != null ? String(cargo.num_trabalhadores) : '',
  )
  const [jornada, setJornada] = useState(cargo?.jornada ?? '')
  const [possuiRiscos, setPossuiRiscos] = useState<boolean | null>(cargo?.possui_riscos ?? null)
  const [riscos, setRiscos] = useState<string[]>(cargo?.riscos ?? [])
  const [riscosOutros, setRiscosOutros] = useState(cargo?.riscos_outros ?? '')
  const [utilizaEpis, setUtilizaEpis] = useState<boolean | null>(cargo?.utiliza_epis ?? null)
  const [epis, setEpis] = useState<string[]>(cargo?.epis ?? [])
  const [episOutros, setEpisOutros] = useState(cargo?.epis_outros ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [erroNome, setErroNome] = useState(false)

  // Riscos: categorias do catálogo viram grupos do acordeão (agentes → itens).
  const gruposRisco = useMemo(
    () => (catalogo?.riscos ?? []).map((c) => ({ codigo: c.codigo, rotulo: c.rotulo, itens: c.agentes })),
    [catalogo],
  )

  const carregando = carregandoChamado || carregandoSetores || carregandoCatalogo

  if (carregando) {
    return (
      <PageWrapper titulo={editando ? 'Editar cargo' : 'Novo cargo'}>
        <div className="h-64 animate-pulse rounded-xl border border-border bg-surface" />
      </PageWrapper>
    )
  }

  const editavel = chamado?.status === 'EM_ANDAMENTO'
  const voltar = () => navigate(`/visitas/${id}`, { state: { setorAberto: setorId } })

  if (!setor || (editando && !cargo)) {
    return (
      <PageWrapper titulo="Cargo">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-12 text-center">
          <AlertCircle className="h-8 w-8 text-error" aria-hidden />
          <p className="font-medium text-content">
            {!setor ? 'Setor não encontrado.' : 'Cargo não encontrado.'}
          </p>
          <Button variante="secondary" onClick={voltar}>
            Voltar à visita
          </Button>
        </div>
      </PageWrapper>
    )
  }

  if (!editavel) {
    return (
      <PageWrapper titulo="Cargo">
        <p className="flex items-start gap-2 rounded-lg bg-warning-bg p-3 text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Esta visita não está em andamento, então os dados não podem ser alterados.
        </p>
        <Button variante="secondary" className="mt-4" onClick={voltar}>
          Voltar à visita
        </Button>
      </PageWrapper>
    )
  }

  async function salvar() {
    if (!nome.trim()) {
      setErroNome(true)
      setErro('Informe o nome do cargo.')
      return
    }
    setErro(null)
    setErroNome(false)

    const numero = numTrab.trim() === '' ? null : Number.parseInt(numTrab, 10)

    const campos: CargoCampos = {
      nome_cargo: nome.trim(),
      descricao_funcao: descricao.trim() || null,
      num_trabalhadores: Number.isNaN(numero) ? null : numero,
      jornada: jornada.trim() || null,
      possui_riscos: possuiRiscos,
      // Se declarou que não há risco, não guarda lista nem "outros" — mantém o banco honesto.
      riscos: possuiRiscos === false ? [] : riscos,
      riscos_outros: possuiRiscos === false ? null : riscosOutros.trim() || null,
      utiliza_epis: utilizaEpis,
      epis: utilizaEpis === false ? [] : epis,
      epis_outros: utilizaEpis === false ? null : episOutros.trim() || null,
    }

    try {
      if (editando && cargo) {
        await atualizar.mutateAsync({ id: cargo.id, body: campos })
      } else {
        await criar.mutateAsync({ setor_id: setorId, ordem: setor!.cargos.length, ...campos })
      }
      voltar()
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível salvar o cargo.'))
    }
  }

  return (
    <PageWrapper
      titulo={editando ? 'Editar cargo' : 'Novo cargo'}
      descricao={`Setor: ${setor.nome}`}
    >
      <Link
        to={`/visitas/${id}`}
        onClick={(e) => {
          e.preventDefault()
          voltar()
        }}
        className="mb-4 inline-flex min-h-touch items-center gap-1.5 font-medium text-primary
          underline-offset-2 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Voltar à visita
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

      <div className="space-y-6">
        {/* --- Identificação --- */}
        <section className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-card">
          <FormField label="Cargo / Função" htmlFor="cargo-nome">
            <Input
              id="cargo-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Operador de prensa"
              erro={erroNome}
              autoFocus
            />
          </FormField>

          <FormField label="Descrição da função" htmlFor="cargo-desc">
            <Textarea
              id="cargo-desc"
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="O que a pessoa faz neste setor (opcional)."
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nº de trabalhadores" htmlFor="cargo-num">
              <Input
                id="cargo-num"
                value={numTrab}
                onChange={(e) => setNumTrab(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                placeholder="Ex.: 8"
              />
            </FormField>
            <FormField label="Jornada / horário" htmlFor="cargo-jornada">
              <Input
                id="cargo-jornada"
                value={jornada}
                onChange={(e) => setJornada(e.target.value)}
                placeholder="Ex.: 44h semanais"
              />
            </FormField>
          </div>
        </section>

        {/* --- Riscos --- */}
        <section className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="cargo-possui-riscos" className="text-lg font-semibold tracking-tightish text-content">
              Há riscos nesta função?
            </h2>
            <SegmentoSimNao valor={possuiRiscos} onChange={setPossuiRiscos} idBase="cargo-possui-riscos" />
          </div>

          {possuiRiscos === true && (
            <>
              <AcordeaoSelecao
                grupos={gruposRisco}
                selecionados={riscos}
                onChange={setRiscos}
                idPrefixo="risco"
              />
              <FormField label="Outros riscos (não listados)" htmlFor="cargo-riscos-outros">
                <Textarea
                  id="cargo-riscos-outros"
                  rows={2}
                  value={riscosOutros}
                  onChange={(e) => setRiscosOutros(e.target.value)}
                  placeholder="Descreva riscos que não estão na lista (opcional)."
                />
              </FormField>
            </>
          )}
          {possuiRiscos === false && (
            <p className="text-sm text-content-secondary">
              Registrado que não há riscos identificados nesta função.
            </p>
          )}
        </section>

        {/* --- EPIs --- */}
        <section className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="cargo-utiliza-epis" className="text-lg font-semibold tracking-tightish text-content">
              Utiliza EPI?
            </h2>
            <SegmentoSimNao valor={utilizaEpis} onChange={setUtilizaEpis} idBase="cargo-utiliza-epis" />
          </div>

          {utilizaEpis === true && (
            <>
              <AcordeaoSelecao
                grupos={catalogo?.epis ?? []}
                selecionados={epis}
                onChange={setEpis}
                idPrefixo="epi"
              />
              <FormField label="Outros EPIs (não listados)" htmlFor="cargo-epis-outros">
                <Textarea
                  id="cargo-epis-outros"
                  rows={2}
                  value={episOutros}
                  onChange={(e) => setEpisOutros(e.target.value)}
                  placeholder="Descreva EPIs que não estão na lista (opcional)."
                />
              </FormField>
            </>
          )}
          {utilizaEpis === false && (
            <p className="text-sm text-content-secondary">Registrado que não utiliza EPI nesta função.</p>
          )}
        </section>

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            variante="action"
            className="w-full sm:w-auto"
            onClick={() => void salvar()}
            carregando={criar.isPending || atualizar.isPending}
          >
            {editando ? 'Salvar alterações' : 'Adicionar cargo'}
          </Button>
          <Button variante="secondary" className="w-full sm:w-auto" onClick={voltar}>
            Cancelar
          </Button>
        </div>
      </div>
    </PageWrapper>
  )
}
