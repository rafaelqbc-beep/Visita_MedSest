import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { useAtualizarUnidade, useCriarUnidade, useUnidade } from '@/hooks/useCadastros'
import { mensagemDeErro } from '@/services/api'
import type { UnidadeMedsest } from '@/types'
import type { UnidadeCreate, UnidadeUpdate } from '@/types/cadastros'

const vazio = (s: string) => s.trim() || null

/** Corpo do formulário — monta só com os dados prontos (ou vazio, no "novo"),
 *  então o `useState` inicial já enxerga o registro. Evita o form vazio na edição. */
function Formulario({ inicial }: { inicial?: UnidadeMedsest }) {
  const editando = Boolean(inicial)
  const navigate = useNavigate()
  const criar = useCriarUnidade()
  const atualizar = useAtualizarUnidade(inicial?.id ?? '')

  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [cnpj, setCnpj] = useState(inicial?.cnpj ?? '')
  const [endereco, setEndereco] = useState(inicial?.endereco ?? '')
  const [cidade, setCidade] = useState(inicial?.cidade ?? '')
  const [estado, setEstado] = useState(inicial?.estado ?? '')
  const [cep, setCep] = useState(inicial?.cep ?? '')
  const [telefone, setTelefone] = useState(inicial?.telefone ?? '')
  const [email, setEmail] = useState(inicial?.email ?? '')
  const [ativo, setAtivo] = useState(inicial?.ativo ?? true)
  const [erro, setErro] = useState<string | null>(null)
  const [erroNome, setErroNome] = useState(false)
  const [erroCnpj, setErroCnpj] = useState(false)

  async function salvar() {
    setErro(null)
    setErroNome(false)
    setErroCnpj(false)
    if (!nome.trim()) {
      setErroNome(true)
      setErro('Informe o nome da unidade.')
      return
    }
    if (!editando && !cnpj.trim()) {
      setErroCnpj(true)
      setErro('Informe o CNPJ da unidade.')
      return
    }

    const comuns = {
      nome: nome.trim(),
      endereco: vazio(endereco),
      cidade: vazio(cidade),
      estado: vazio(estado),
      cep: vazio(cep),
      telefone: vazio(telefone),
      email: vazio(email),
    }

    try {
      if (editando && inicial) {
        const body: UnidadeUpdate = { ...comuns, ativo }
        await atualizar.mutateAsync(body)
      } else {
        const body: UnidadeCreate = { ...comuns, cnpj: cnpj.trim() }
        await criar.mutateAsync(body)
      }
      navigate('/unidades')
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível salvar a unidade.'))
    }
  }

  return (
    <>
      {erro && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-error-bg p-3 text-error"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{erro}</span>
        </div>
      )}

      <div className="max-w-2xl space-y-4 rounded-xl border border-border bg-surface p-4 shadow-card">
        <FormField label="Nome da unidade" htmlFor="u-nome" erro={erroNome ? 'Obrigatório.' : undefined}>
          <Input id="u-nome" value={nome} onChange={(e) => setNome(e.target.value)} erro={erroNome} autoFocus />
        </FormField>

        <FormField label="CNPJ" htmlFor="u-cnpj" erro={erroCnpj ? 'Obrigatório.' : undefined}>
          <Input
            id="u-cnpj"
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            placeholder="00.000.000/0000-00"
            erro={erroCnpj}
            disabled={editando}
          />
        </FormField>
        {editando && <p className="-mt-2 text-xs text-content-secondary">O CNPJ não pode ser alterado.</p>}

        <FormField label="Endereço" htmlFor="u-endereco">
          <Input id="u-endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Cidade" htmlFor="u-cidade">
            <Input id="u-cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
          </FormField>
          <FormField label="UF" htmlFor="u-uf">
            <Input
              id="u-uf"
              value={estado}
              onChange={(e) => setEstado(e.target.value.toUpperCase().slice(0, 2))}
              maxLength={2}
              placeholder="GO"
            />
          </FormField>
          <FormField label="CEP" htmlFor="u-cep">
            <Input id="u-cep" value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Telefone" htmlFor="u-tel">
            <Input id="u-tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </FormField>
          <FormField label="E-mail" htmlFor="u-email">
            <Input id="u-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
          </FormField>
        </div>

        {editando && (
          <label className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-content">Unidade ativa</span>
          </label>
        )}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row-reverse">
          <Button
            className="w-full sm:w-auto"
            onClick={() => void salvar()}
            carregando={criar.isPending || atualizar.isPending}
          >
            {editando ? 'Salvar alterações' : 'Criar unidade'}
          </Button>
          <Button variante="secondary" className="w-full sm:w-auto" onClick={() => navigate('/unidades')}>
            Cancelar
          </Button>
        </div>
      </div>
    </>
  )
}

export default function UnidadeFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editando = Boolean(id)
  const { data: unidade, isLoading, isError } = useUnidade(id)

  return (
    <PageWrapper titulo={editando ? 'Editar unidade' : 'Nova unidade'}>
      <button
        type="button"
        onClick={() => navigate('/unidades')}
        className="mb-4 inline-flex min-h-touch items-center gap-1.5 font-medium text-primary
          underline-offset-2 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Voltar às unidades
      </button>

      {editando && isLoading ? (
        <div className="h-64 animate-pulse rounded-xl border border-border bg-surface" />
      ) : editando && (isError || !unidade) ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-12 text-center">
          <AlertCircle className="h-8 w-8 text-error" aria-hidden />
          <p className="font-medium text-content">Unidade não encontrada.</p>
        </div>
      ) : (
        <Formulario inicial={unidade} />
      )}
    </PageWrapper>
  )
}
