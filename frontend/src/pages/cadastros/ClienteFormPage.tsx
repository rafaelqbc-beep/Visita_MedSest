import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import {
  useAtualizarCliente,
  useCliente,
  useCriarCliente,
  useGestores,
  useUnidadesAtivas,
} from '@/hooks/useCadastros'
import { mensagemDeErro } from '@/services/api'
import type { Cliente, TipoVisita } from '@/types'
import type { ClienteCreate, ClienteUpdate } from '@/types/cadastros'

const vazio = (s: string) => s.trim() || null

const TIPOS: { valor: TipoVisita; rotulo: string }[] = [
  { valor: 'NOVO_CLIENTE', rotulo: 'Novo Cliente' },
  { valor: 'RENOVACAO', rotulo: 'Renovação' },
  { valor: 'VISITA_TECNICA', rotulo: 'Visita Técnica' },
]

function Formulario({ inicial }: { inicial?: Cliente }) {
  const editando = Boolean(inicial)
  const navigate = useNavigate()
  const criar = useCriarCliente()
  const atualizar = useAtualizarCliente(inicial?.id ?? '')
  const { data: gestores = [] } = useGestores()
  const { data: unidades = [] } = useUnidadesAtivas()

  const [razao, setRazao] = useState(inicial?.razao_social ?? '')
  const [cnpj, setCnpj] = useState(inicial?.cnpj ?? '')
  const [fantasia, setFantasia] = useState(inicial?.nome_fantasia ?? '')
  const [filial, setFilial] = useState(inicial?.filial ?? '')
  const [endereco, setEndereco] = useState(inicial?.endereco ?? '')
  const [cidade, setCidade] = useState(inicial?.cidade ?? '')
  const [estado, setEstado] = useState(inicial?.estado ?? '')
  const [cep, setCep] = useState(inicial?.cep ?? '')
  const [contato, setContato] = useState(inicial?.nome_contato ?? '')
  const [celular, setCelular] = useState(inicial?.celular_contato ?? '')
  const [email, setEmail] = useState(inicial?.email_contato ?? '')
  const [tipo, setTipo] = useState<TipoVisita | ''>(inicial?.tipo_visita_padrao ?? '')
  const [gestorId, setGestorId] = useState(inicial?.gestor_comercial_id ?? '')
  const [unidadeId, setUnidadeId] = useState(inicial?.unidade_medsest_id ?? '')
  const [ativo, setAtivo] = useState(inicial?.ativo ?? true)
  const [erro, setErro] = useState<string | null>(null)
  const [erroRazao, setErroRazao] = useState(false)

  async function salvar() {
    setErro(null)
    if (!razao.trim()) {
      setErroRazao(true)
      setErro('Informe a razão social.')
      return
    }
    setErroRazao(false)

    const comuns = {
      razao_social: razao.trim(),
      cnpj: vazio(cnpj),
      nome_fantasia: vazio(fantasia),
      filial: vazio(filial),
      endereco: vazio(endereco),
      cidade: vazio(cidade),
      estado: vazio(estado),
      cep: vazio(cep),
      nome_contato: vazio(contato),
      celular_contato: vazio(celular),
      email_contato: vazio(email),
      tipo_visita_padrao: tipo || null,
      gestor_comercial_id: gestorId || null,
      unidade_medsest_id: unidadeId || null,
    }

    try {
      if (editando && inicial) {
        const body: ClienteUpdate = { ...comuns, ativo }
        await atualizar.mutateAsync(body)
      } else {
        await criar.mutateAsync(comuns as ClienteCreate)
      }
      navigate('/clientes')
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível salvar o cliente.'))
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

      <div className="max-w-2xl space-y-6">
        {/* Identificação */}
        <section className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-card">
          <h2 className="font-semibold tracking-tightish text-content">Identificação</h2>
          <FormField label="Razão social" htmlFor="cl-razao" erro={erroRazao ? 'Obrigatório.' : undefined}>
            <Input id="cl-razao" value={razao} onChange={(e) => setRazao(e.target.value)} erro={erroRazao} autoFocus />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="CNPJ" htmlFor="cl-cnpj">
              <Input id="cl-cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
            </FormField>
            <FormField label="Nome fantasia" htmlFor="cl-fantasia">
              <Input id="cl-fantasia" value={fantasia} onChange={(e) => setFantasia(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Filial" htmlFor="cl-filial">
            <Input id="cl-filial" value={filial} onChange={(e) => setFilial(e.target.value)} />
          </FormField>
        </section>

        {/* Endereço */}
        <section className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-card">
          <h2 className="font-semibold tracking-tightish text-content">Endereço</h2>
          <FormField label="Endereço" htmlFor="cl-end">
            <Textarea id="cl-end" rows={2} value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Cidade" htmlFor="cl-cidade">
              <Input id="cl-cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
            </FormField>
            <FormField label="UF" htmlFor="cl-uf">
              <Input
                id="cl-uf"
                value={estado}
                onChange={(e) => setEstado(e.target.value.toUpperCase().slice(0, 2))}
                maxLength={2}
                placeholder="GO"
              />
            </FormField>
            <FormField label="CEP" htmlFor="cl-cep">
              <Input id="cl-cep" value={cep} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" />
            </FormField>
          </div>
        </section>

        {/* Contato */}
        <section className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-card">
          <h2 className="font-semibold tracking-tightish text-content">Contato</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nome do contato" htmlFor="cl-contato">
              <Input id="cl-contato" value={contato} onChange={(e) => setContato(e.target.value)} />
            </FormField>
            <FormField label="Celular" htmlFor="cl-cel">
              <Input id="cl-cel" value={celular} onChange={(e) => setCelular(e.target.value)} />
            </FormField>
          </div>
          <FormField label="E-mail do contato" htmlFor="cl-email">
            <Input
              id="cl-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
          </FormField>
          <p className="text-xs text-content-secondary">
            O e-mail recebe a cópia do relatório assinado após a visita.
          </p>
        </section>

        {/* Atendimento */}
        <section className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-card">
          <h2 className="font-semibold tracking-tightish text-content">Atendimento</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Tipo de visita padrão" htmlFor="cl-tipo">
              <Select id="cl-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoVisita | '')}>
                <option value="">Não definido</option>
                {TIPOS.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.rotulo}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Unidade MedSest" htmlFor="cl-unidade">
              <Select id="cl-unidade" value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)}>
                <option value="">Não definida</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField label="Gestor comercial" htmlFor="cl-gestor">
            <Select id="cl-gestor" value={gestorId} onChange={(e) => setGestorId(e.target.value)}>
              <option value="">Não definido</option>
              {gestores.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nome}
                </option>
              ))}
            </Select>
          </FormField>

          {editando && (
            <label className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-content">Cliente ativo</span>
            </label>
          )}
        </section>

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            className="w-full sm:w-auto"
            onClick={() => void salvar()}
            carregando={criar.isPending || atualizar.isPending}
          >
            {editando ? 'Salvar alterações' : 'Criar cliente'}
          </Button>
          <Button variante="secondary" className="w-full sm:w-auto" onClick={() => navigate('/clientes')}>
            Cancelar
          </Button>
        </div>
      </div>
    </>
  )
}

export default function ClienteFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editando = Boolean(id)
  const { data: cliente, isLoading, isError } = useCliente(id)

  return (
    <PageWrapper titulo={editando ? 'Editar cliente' : 'Novo cliente'}>
      <button
        type="button"
        onClick={() => navigate('/clientes')}
        className="mb-4 inline-flex min-h-touch items-center gap-1.5 font-medium text-primary
          underline-offset-2 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Voltar aos clientes
      </button>

      {editando && isLoading ? (
        <div className="h-64 animate-pulse rounded-xl border border-border bg-surface" />
      ) : editando && (isError || !cliente) ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-12 text-center">
          <AlertCircle className="h-8 w-8 text-error" aria-hidden />
          <p className="font-medium text-content">Cliente não encontrado.</p>
        </div>
      ) : (
        <Formulario inicial={cliente} />
      )}
    </PageWrapper>
  )
}
