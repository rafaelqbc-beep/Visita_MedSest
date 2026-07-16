import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, FileDown, FileText, MapPin } from 'lucide-react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { StatusBadge } from '@/components/StatusBadge'
import { TipoVisitaBadge } from '@/components/TipoVisitaBadge'
import { Button } from '@/components/ui/Button'
import { useChamado } from '@/hooks/useChamados'
import { useSetores } from '@/hooks/useVisita'
import { data as fmtData, dataHora } from '@/lib/formato'
import { mensagemDeErro } from '@/services/api'
import { baixarReciboPdf, exportarWord } from '@/services/relatorioService'
import { urlDaFoto } from '@/services/visitaService'
import { useQueryClient } from '@tanstack/react-query'

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-content-secondary">{rotulo}</dt>
      <dd className="mt-0.5 text-sm text-content">{valor}</dd>
    </div>
  )
}

export default function RelatorioDetalhePage() {
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const { data: chamado, isLoading, isError } = useChamado(id)
  const { data: setores = [] } = useSetores(id)
  const [baixando, setBaixando] = useState<'word' | 'pdf' | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  if (isLoading) {
    return (
      <PageWrapper titulo="Relatório">
        <div className="h-64 animate-pulse rounded-xl border border-border bg-surface" />
      </PageWrapper>
    )
  }

  if (isError || !chamado) {
    return (
      <PageWrapper titulo="Relatório">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-12 text-center">
          <AlertCircle className="h-8 w-8 text-error" aria-hidden />
          <p className="font-medium text-content">Relatório não encontrado.</p>
          <Link to="/relatorios">
            <Button variante="secondary">Voltar aos relatórios</Button>
          </Link>
        </div>
      </PageWrapper>
    )
  }

  async function baixar(tipo: 'word' | 'pdf') {
    if (!chamado) return
    setErro(null)
    setBaixando(tipo)
    try {
      if (tipo === 'word') {
        await exportarWord(chamado.id, chamado.numero_chamado)
        // Marca dt_exportacao_word no primeiro download.
        await qc.invalidateQueries({ queryKey: ['chamado', chamado.id] })
        void qc.invalidateQueries({ queryKey: ['chamados'] })
        void qc.invalidateQueries({ queryKey: ['dashboard'] })
      } else {
        await baixarReciboPdf(chamado.id, chamado.numero_chamado)
      }
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível gerar o arquivo.'))
    } finally {
      setBaixando(null)
    }
  }

  const totalCargos = setores.reduce((s, setor) => s + setor.cargos.length, 0)
  const totalFotos = setores.reduce((s, setor) => s + setor.fotos.length, 0)

  return (
    <PageWrapper
      titulo={chamado.cliente_razao_social ?? 'Relatório'}
      descricao={`Chamado #${chamado.numero_chamado}`}
      acoes={
        <div className="flex flex-wrap gap-2">
          <Button
            variante="secondary"
            onClick={() => void baixar('pdf')}
            carregando={baixando === 'pdf'}
          >
            <FileText className="h-4 w-4" aria-hidden />
            Comprovante (PDF)
          </Button>
          <Button onClick={() => void baixar('word')} carregando={baixando === 'word'}>
            <FileDown className="h-4 w-4" aria-hidden />
            Exportar Word
          </Button>
        </div>
      }
    >
      <Link
        to="/relatorios"
        className="mb-4 inline-flex items-center gap-1.5 font-medium text-primary
          underline-offset-2 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Voltar aos relatórios
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ---------- Dados da visita ---------- */}
        <section className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-card">
          <div>
            <h2 className="mb-2 font-semibold tracking-tightish text-content">Dados da visita</h2>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={chamado.status} />
              <TipoVisitaBadge tipo={chamado.tipo_visita} />
            </div>
          </div>

          <dl className="grid gap-3">
            <Campo rotulo="Técnico externo" valor={chamado.tecnico_externo_nome ?? '—'} />
            <Campo rotulo="Data proposta" valor={fmtData(chamado.data_proposta)} />
            <Campo rotulo="Início" valor={dataHora(chamado.dt_inicio_visita)} />
            <Campo rotulo="Fim" valor={dataHora(chamado.dt_fim_visita)} />
            <Campo rotulo="Liberado em" valor={dataHora(chamado.dt_liberado_tecnico_interno)} />
            <Campo
              rotulo="Exportado em"
              valor={chamado.dt_exportacao_word ? dataHora(chamado.dt_exportacao_word) : 'Ainda não'}
            />
          </dl>

          {chamado.recomendacoes && (
            <div>
              <p className="text-xs text-content-secondary">Recomendações do gestor</p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-content">
                {chamado.recomendacoes}
              </p>
            </div>
          )}

          <p className="text-sm text-content-secondary">
            {setores.length} {setores.length === 1 ? 'setor' : 'setores'} · {totalCargos}{' '}
            {totalCargos === 1 ? 'cargo' : 'cargos'} · {totalFotos}{' '}
            {totalFotos === 1 ? 'foto' : 'fotos'}
          </p>
        </section>

        {/* ---------- Setores ---------- */}
        <section className="space-y-4 lg:col-span-2">
          {setores.map((setor, i) => (
            <article key={setor.id} className="rounded-xl border border-border bg-surface p-4 shadow-card">
              <h3 className="font-semibold tracking-tightish text-content">
                {i + 1}. {setor.nome}
              </h3>
              {setor.descricao_ambiente && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-content-secondary">
                  {setor.descricao_ambiente}
                </p>
              )}

              {setor.cargos.length > 0 && (
                <div className="mt-3">
                  <h4 className="mb-1 text-sm font-medium text-content-label">Cargos e funções</h4>
                  <ul className="space-y-1">
                    {setor.cargos.map((cargo) => (
                      <li key={cargo.id} className="text-sm text-content">
                        • {cargo.nome_cargo}
                        {cargo.descricao_funcao && (
                          <span className="text-content-secondary"> — {cargo.descricao_funcao}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {setor.fotos.length > 0 && (
                <div className="mt-3">
                  <h4 className="mb-2 text-sm font-medium text-content-label">
                    Registro fotográfico
                  </h4>
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {setor.fotos.map((foto) => (
                      <li key={foto.id}>
                        {/* Abre em nova aba: o técnico interno precisa ver a
                            foto em tamanho real para descrever o risco. */}
                        <a
                          href={urlDaFoto(foto.caminho_arquivo)}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-lg focus-visible:outline-none focus-visible:ring-2
                            focus-visible:ring-primary"
                        >
                          <img
                            src={urlDaFoto(foto.caminho_arquivo)}
                            alt={foto.descricao || foto.nome_original || 'Foto do setor'}
                            loading="lazy"
                            className="aspect-[4/3] w-full rounded-lg border border-border object-cover
                              transition-opacity hover:opacity-80"
                          />
                        </a>
                        {foto.descricao && (
                          <p className="mt-1 text-xs text-content-secondary">{foto.descricao}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))}

          {/* ---------- Assinaturas ---------- */}
          <article className="rounded-xl border border-border bg-surface p-4 shadow-card">
            <h3 className="mb-3 font-semibold tracking-tightish text-content">
              Conferência e assinaturas
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-content-secondary">
                  Cliente
                </p>
                {chamado.assinatura_cliente_caminho && (
                  <img
                    src={urlDaFoto(chamado.assinatura_cliente_caminho)}
                    alt={`Assinatura de ${chamado.assinatura_cliente_nome}`}
                    className="mt-1 h-16 bg-white"
                  />
                )}
                <div className="mt-1 border-t border-border pt-1">
                  <p className="text-sm text-content">{chamado.assinatura_cliente_nome ?? '—'}</p>
                  <p className="text-xs text-content-secondary">
                    CPF {chamado.assinatura_cliente_cpf ?? '—'}
                  </p>
                  <p className="text-xs text-content-secondary">
                    {dataHora(chamado.dt_assinatura_cliente)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-content-secondary">
                  Técnico MedSest
                </p>
                {chamado.assinatura_tecnico_caminho && (
                  <img
                    src={urlDaFoto(chamado.assinatura_tecnico_caminho)}
                    alt="Assinatura do técnico"
                    className="mt-1 h-16 bg-white"
                  />
                )}
                <div className="mt-1 border-t border-border pt-1">
                  <p className="text-sm text-content">{chamado.tecnico_externo_nome ?? '—'}</p>
                  <p className="text-xs text-content-secondary">
                    {dataHora(chamado.dt_assinatura_tecnico)}
                  </p>
                </div>
              </div>
            </div>

            {chamado.geoloc_assinatura_latitude != null && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-content-secondary">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Assinado em {Number(chamado.geoloc_assinatura_latitude).toFixed(5)},{' '}
                {Number(chamado.geoloc_assinatura_longitude).toFixed(5)}
              </p>
            )}
          </article>
        </section>
      </div>
    </PageWrapper>
  )
}
