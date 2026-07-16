import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, ArrowLeft, Info } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ClienteAutocomplete } from '@/components/ClienteAutocomplete'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useCriarChamado, useTecnicosExternos } from '@/hooks/useChamados'
import { ROTULO_TIPO_VISITA } from '@/lib/coresGrafico'
import { mensagemDeErro } from '@/services/api'
import type { Cliente, TipoVisita } from '@/types'

const TIPOS: TipoVisita[] = ['NOVO_CLIENTE', 'RENOVACAO', 'VISITA_TECNICA']

const schema = z.object({
  cliente_id: z.string().min(1, 'Selecione o cliente.'),
  // Obrigatório por regra de negócio (pedido da área comercial).
  tipo_visita: z.enum(['NOVO_CLIENTE', 'RENOVACAO', 'VISITA_TECNICA'], {
    errorMap: () => ({ message: 'Selecione o tipo de visita.' }),
  }),
  tecnico_externo_id: z.string().optional(),
  data_proposta: z.string().optional(),
  recomendacoes: z.string().optional(),
})

type FormNovoChamado = z.infer<typeof schema>

export default function NovoChamadoPage() {
  const navigate = useNavigate()
  const criar = useCriarChamado()
  const { data: tecnicos = [] } = useTecnicosExternos()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [erroApi, setErroApi] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormNovoChamado>({ resolver: zodResolver(schema) })

  function aoEscolherCliente(c: Cliente | null) {
    setCliente(c)
    setValue('cliente_id', c?.id ?? '', { shouldValidate: true })
    // O cliente pode ter um tipo padrão cadastrado: pré-seleciona, mas o
    // gestor continua livre para trocar.
    if (c?.tipo_visita_padrao) {
      setValue('tipo_visita', c.tipo_visita_padrao, { shouldValidate: true })
    }
  }

  async function onSubmit(form: FormNovoChamado) {
    setErroApi(null)
    try {
      const chamado = await criar.mutateAsync({
        cliente_id: form.cliente_id,
        tipo_visita: form.tipo_visita,
        tecnico_externo_id: form.tecnico_externo_id || null,
        data_proposta: form.data_proposta || null,
        recomendacoes: form.recomendacoes || null,
      })
      navigate(`/chamados/${chamado.id}`, { replace: true })
    } catch (erro) {
      setErroApi(mensagemDeErro(erro, 'Não foi possível abrir o chamado.'))
    }
  }

  return (
    <PageWrapper titulo="Novo chamado" descricao="Abertura de visita técnica.">
      <Link
        to="/chamados"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary
          underline-offset-2 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Voltar para os chamados
      </Link>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="max-w-2xl space-y-4 rounded-xl border border-border bg-surface p-6 shadow-card"
      >
        <FormField label="Cliente" htmlFor="cliente" erro={errors.cliente_id?.message}>
          <Controller
            name="cliente_id"
            control={control}
            render={() => (
              <ClienteAutocomplete
                id="cliente"
                valor={cliente}
                onChange={aoEscolherCliente}
                erro={!!errors.cliente_id}
              />
            )}
          />
        </FormField>

        <FormField label="Tipo de visita" htmlFor="tipo_visita" erro={errors.tipo_visita?.message}>
          <Select id="tipo_visita" erro={!!errors.tipo_visita} {...register('tipo_visita')} defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {ROTULO_TIPO_VISITA[t]}
              </option>
            ))}
          </Select>
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Técnico externo" htmlFor="tecnico_externo_id">
            <Select id="tecnico_externo_id" {...register('tecnico_externo_id')} defaultValue="">
              <option value="">Definir depois</option>
              {tecnicos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Data proposta" htmlFor="data_proposta">
            <Input id="data_proposta" type="date" {...register('data_proposta')} />
          </FormField>
        </div>

        <FormField label="Recomendações" htmlFor="recomendacoes">
          <Textarea
            id="recomendacoes"
            placeholder="Orientações para o técnico em campo (opcional)."
            {...register('recomendacoes')}
          />
        </FormField>

        {/* O técnico interno não é campo: o round-robin decide. Dizer isso
            evita o gestor procurar onde escolher. */}
        <p className="flex items-start gap-2 rounded-lg bg-info-bg p-3 text-sm text-blue-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          O técnico interno é atribuído automaticamente por rodízio ao abrir o chamado. Você pode
          trocá-lo depois, se precisar.
        </p>

        {erroApi && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-red-200 bg-error-bg p-3 text-sm text-error"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{erroApi}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Link to="/chamados">
            <Button variante="secondary" type="button">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" carregando={isSubmitting}>
            Abrir chamado
          </Button>
        </div>
      </form>
    </PageWrapper>
  )
}
