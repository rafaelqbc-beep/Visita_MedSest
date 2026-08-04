import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import {
  useAtualizarUsuario,
  useCriarUsuario,
  useUnidadesAtivas,
  useUsuario,
} from '@/hooks/useCadastros'
import { ROTULO_ROLE } from '@/lib/navegacao'
import { mensagemDeErro } from '@/services/api'
import type { Role, Usuario } from '@/types'
import type { UsuarioCreate, UsuarioUpdate } from '@/types/cadastros'

const vazio = (s: string) => s.trim() || null
const ROLES: Role[] = ['ADMIN', 'GESTOR_COMERCIAL', 'TECNICO_EXTERNO', 'TECNICO_INTERNO']

function Formulario({ inicial }: { inicial?: Usuario }) {
  const editando = Boolean(inicial)
  const navigate = useNavigate()
  const criar = useCriarUsuario()
  const atualizar = useAtualizarUsuario(inicial?.id ?? '')
  const { data: unidades = [] } = useUnidadesAtivas()

  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [email, setEmail] = useState(inicial?.email ?? '')
  const [senha, setSenha] = useState('')
  const [telefone, setTelefone] = useState(inicial?.telefone ?? '')
  const [whatsapp, setWhatsapp] = useState(inicial?.whatsapp ?? '')
  const [role, setRole] = useState<Role | ''>(inicial?.role ?? '')
  const [unidadeId, setUnidadeId] = useState(inicial?.unidade_id ?? '')
  const [ativo, setAtivo] = useState(inicial?.ativo ?? true)
  const [erro, setErro] = useState<string | null>(null)
  const [erros, setErros] = useState<{ nome?: boolean; email?: boolean; senha?: boolean; role?: boolean }>({})

  async function salvar() {
    setErro(null)
    const novosErros = {
      nome: !nome.trim(),
      email: !email.trim(),
      // Senha: obrigatória no cadastro; na edição, em branco = manter a atual.
      senha: !editando && senha.trim().length < 6,
      role: !role,
    }
    setErros(novosErros)
    if (novosErros.nome || novosErros.email || novosErros.senha || novosErros.role) {
      setErro(
        novosErros.senha && !editando
          ? 'A senha precisa de ao menos 6 caracteres.'
          : 'Preencha os campos obrigatórios.',
      )
      return
    }

    const comuns = {
      nome: nome.trim(),
      email: email.trim(),
      telefone: vazio(telefone),
      whatsapp: vazio(whatsapp),
      role: role as Role,
      unidade_id: unidadeId || null,
    }

    try {
      if (editando && inicial) {
        const body: UsuarioUpdate = { ...comuns, ativo }
        // Só manda a senha se o admin digitou uma nova.
        if (senha.trim()) body.senha = senha.trim()
        await atualizar.mutateAsync(body)
      } else {
        const body: UsuarioCreate = { ...comuns, senha: senha.trim() }
        await criar.mutateAsync(body)
      }
      navigate('/usuarios')
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível salvar o usuário.'))
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
        <FormField label="Nome completo" htmlFor="us-nome" erro={erros.nome ? 'Obrigatório.' : undefined}>
          <Input id="us-nome" value={nome} onChange={(e) => setNome(e.target.value)} erro={erros.nome} autoFocus />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="E-mail" htmlFor="us-email" erro={erros.email ? 'Obrigatório.' : undefined}>
            <Input
              id="us-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              erro={erros.email}
              autoComplete="off"
            />
          </FormField>
          <FormField
            label={editando ? 'Nova senha' : 'Senha'}
            htmlFor="us-senha"
            erro={erros.senha ? 'Mínimo de 6 caracteres.' : undefined}
          >
            <Input
              id="us-senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder={editando ? 'Deixe em branco para manter' : 'Mínimo de 6 caracteres'}
              erro={erros.senha}
              autoComplete="new-password"
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Perfil" htmlFor="us-role" erro={erros.role ? 'Obrigatório.' : undefined}>
            <Select
              id="us-role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role | '')}
              erro={erros.role}
            >
              <option value="">Selecione…</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROTULO_ROLE[r]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Unidade" htmlFor="us-unidade">
            <Select id="us-unidade" value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)}>
              <option value="">Sem unidade</option>
              {unidades.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Telefone" htmlFor="us-tel">
            <Input id="us-tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
          </FormField>
          <FormField label="WhatsApp" htmlFor="us-wpp">
            <Input id="us-wpp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
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
            <span className="text-sm text-content">Usuário ativo</span>
          </label>
        )}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row-reverse">
          <Button
            className="w-full sm:w-auto"
            onClick={() => void salvar()}
            carregando={criar.isPending || atualizar.isPending}
          >
            {editando ? 'Salvar alterações' : 'Criar usuário'}
          </Button>
          <Button variante="secondary" className="w-full sm:w-auto" onClick={() => navigate('/usuarios')}>
            Cancelar
          </Button>
        </div>
      </div>
    </>
  )
}

export default function UsuarioFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editando = Boolean(id)
  const { data: usuario, isLoading, isError } = useUsuario(id)

  return (
    <PageWrapper titulo={editando ? 'Editar usuário' : 'Novo usuário'}>
      <button
        type="button"
        onClick={() => navigate('/usuarios')}
        className="mb-4 inline-flex min-h-touch items-center gap-1.5 font-medium text-primary
          underline-offset-2 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Voltar aos usuários
      </button>

      {editando && isLoading ? (
        <div className="h-64 animate-pulse rounded-xl border border-border bg-surface" />
      ) : editando && (isError || !usuario) ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-12 text-center">
          <AlertCircle className="h-8 w-8 text-error" aria-hidden />
          <p className="font-medium text-content">Usuário não encontrado.</p>
        </div>
      ) : (
        <Formulario inicial={usuario} />
      )}
    </PageWrapper>
  )
}
