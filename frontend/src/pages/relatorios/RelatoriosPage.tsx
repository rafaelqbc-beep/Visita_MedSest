import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Clock, FileDown } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { TipoVisitaBadge } from '@/components/TipoVisitaBadge'
import { Button } from '@/components/ui/Button'
import { Paginacao } from '@/components/ui/Paginacao'
import { useChamados } from '@/hooks/useChamados'
import { dataHora } from '@/lib/formato'
import { cn } from '@/lib/utils'
import { mensagemDeErro } from '@/services/api'
import { exportarWord } from '@/services/relatorioService'
import { useQueryClient } from '@tanstack/react-query'
import type { ChamadoListItem } from '@/types/chamado'

export default function RelatoriosPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [pagina, setPagina] = useState(1)
  // O escopo do backend já entrega só os FINALIZADOS atribuídos a este técnico
  // interno — não precisa filtrar por status aqui.
  const { data, isLoading, isError, refetch } = useChamados({ page: pagina, size: 20 })
  const [baixando, setBaixando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function baixar(chamado: ChamadoListItem) {
    setErro(null)
    setBaixando(chamado.id)
    try {
      await exportarWord(chamado.id, chamado.numero_chamado)
      // O primeiro download grava dt_exportacao_word: relê para o card sair da
      // lista de pendentes.
      await qc.invalidateQueries({ queryKey: ['chamados'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível gerar o relatório.'))
    } finally {
      setBaixando(null)
    }
  }

  if (isLoading) {
    return (
      <PageWrapper titulo="Relatórios">
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-surface" />
          ))}
        </div>
      </PageWrapper>
    )
  }

  if (isError) {
    return (
      <PageWrapper titulo="Relatórios">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-12 text-center">
          <AlertCircle className="h-8 w-8 text-error" aria-hidden />
          <p className="font-medium text-content">Não foi possível carregar os relatórios.</p>
          <Button variante="secondary" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      </PageWrapper>
    )
  }

  const itens = data?.items ?? []
  const pendentes = itens.filter((c) => !c.dt_exportacao_word)

  return (
    <PageWrapper
      titulo="Relatórios"
      descricao="Visitas assinadas e liberadas para a elaboração do PGR."
    >
      {erro && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-error-bg p-3 text-error"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{erro}</span>
        </div>
      )}

      {itens.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center">
          <p className="text-lg font-medium text-content">Nenhum relatório na sua fila.</p>
          <p className="mt-1 text-content-secondary">
            Quando uma visita atribuída a você for assinada em campo, ela aparece aqui.
          </p>
        </div>
      ) : (
        <>
          {pendentes.length > 0 && (
            <p className="mb-4 text-sm text-content-secondary">
              {pendentes.length} {pendentes.length === 1 ? 'relatório aguarda' : 'relatórios aguardam'}{' '}
              exportação.
            </p>
          )}

          <ul className="space-y-3">
            {itens.map((chamado) => {
              const exportado = Boolean(chamado.dt_exportacao_word)
              return (
                <li
                  key={chamado.id}
                  className={cn(
                    'rounded-xl border bg-surface p-4 shadow-card',
                    // O que ainda não foi entregue merece destaque: é a fila
                    // de trabalho do técnico interno.
                    exportado ? 'border-border' : 'border-primary/30',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-content-secondary">
                        Chamado #{chamado.numero_chamado}
                      </p>
                      <h2 className="mt-0.5 font-semibold tracking-tightish text-content">
                        {chamado.cliente_razao_social ?? '—'}
                      </h2>
                      <p className="mt-1 text-sm text-content-secondary">
                        Visita em {dataHora(chamado.dt_fim_visita)} · técnico{' '}
                        {chamado.tecnico_externo_nome ?? '—'}
                      </p>
                      {chamado.assinatura_cliente_nome && (
                        <p className="text-sm text-content-secondary">
                          Assinado por {chamado.assinatura_cliente_nome}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <TipoVisitaBadge tipo={chamado.tipo_visita} />
                      {exportado ? (
                        <span className="flex items-center gap-1.5 text-xs text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                          Exportado em {dataHora(chamado.dt_exportacao_word)}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-primary">
                          <Clock className="h-3.5 w-3.5" aria-hidden />
                          Aguardando exportação
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variante="secondary"
                      onClick={() => navigate(`/relatorios/${chamado.id}`)}
                    >
                      Ver detalhes
                    </Button>
                    <Button
                      variante={exportado ? 'secondary' : 'primary'}
                      onClick={() => void baixar(chamado)}
                      carregando={baixando === chamado.id}
                    >
                      <FileDown className="h-4 w-4" aria-hidden />
                      {exportado ? 'Baixar de novo' : 'Exportar Word'}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>

          {data && (
            <Paginacao
              pagina={data.page}
              paginas={data.pages}
              total={data.total}
              onMudar={setPagina}
            />
          )}
        </>
      )}
    </PageWrapper>
  )
}
