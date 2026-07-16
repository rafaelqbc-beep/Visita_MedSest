import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'
import { mensagemDeErro } from '@/services/api'

const schema = z.object({
  email: z.string().min(1, 'Informe seu e-mail.').email('E-mail inválido.'),
  senha: z.string().min(1, 'Informe sua senha.'),
})

type FormLogin = z.infer<typeof schema>

export default function LoginPage() {
  const { entrar, autenticado, carregando } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erroLogin, setErroLogin] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormLogin>({ resolver: zodResolver(schema) })

  // Quem já está logado não vê a tela de login.
  if (!carregando && autenticado) {
    const destino = (location.state as { from?: string } | null)?.from ?? '/'
    return <Navigate to={destino} replace />
  }

  async function onSubmit({ email, senha }: FormLogin) {
    setErroLogin(null)
    try {
      await entrar(email, senha)
      // Volta para a página que o usuário tentou abrir antes de ser barrado.
      const destino = (location.state as { from?: string } | null)?.from ?? '/'
      navigate(destino, { replace: true })
    } catch (erro) {
      setErroLogin(mensagemDeErro(erro, 'Não foi possível entrar. Tente novamente.'))
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <img src="/logo_medsest.png" alt="MedSest" className="h-14" />
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <h1 className="text-xl font-semibold tracking-tightish text-content">Entrar</h1>
          <p className="mt-1 text-sm text-content-secondary">
            Acesse sua conta para gerenciar as visitas técnicas.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <FormField label="E-mail" htmlFor="email" erro={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="voce@medsest.com.br"
                erro={!!errors.email}
                autoFocus
                {...register('email')}
              />
            </FormField>

            <FormField label="Senha" htmlFor="senha" erro={errors.senha?.message}>
              <Input
                id="senha"
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                erro={!!errors.senha}
                {...register('senha')}
                sufixo={
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-content-secondary
                      transition-colors hover:bg-accent hover:text-primary focus-visible:outline-none
                      focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {mostrarSenha ? (
                      <EyeOff className="h-4 w-4" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                }
              />
            </FormField>

            {erroLogin && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-200 bg-error-bg p-3 text-sm text-error"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>{erroLogin}</span>
              </div>
            )}

            <Button type="submit" carregando={isSubmitting} className="w-full">
              Entrar
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-content-secondary">
          MedSest — Medicina e Segurança do Trabalho
        </p>
      </div>
    </main>
  )
}
