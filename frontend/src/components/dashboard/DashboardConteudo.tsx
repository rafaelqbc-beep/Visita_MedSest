import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CalendarClock, ClipboardList, Clock, MapPin, Timer } from 'lucide-react'
import { CardGrafico, TabelaDados } from '@/components/charts/CardGrafico'
import { Meter } from '@/components/charts/Meter'
import { StatTile } from '@/components/charts/StatTile'
import { TooltipGrafico } from '@/components/charts/TooltipGrafico'
import {
  COR_MAGNITUDE,
  COR_STATUS,
  COR_TIPO_VISITA,
  CROMO,
  ORDEM_TIPO_VISITA,
  ROTULO_STATUS,
  ROTULO_TIPO_VISITA,
} from '@/lib/coresGrafico'
import { cn } from '@/lib/utils'
import type { DashboardResponse } from '@/types/dashboard'

const EIXO = { fontSize: 12, fill: CROMO.eixo }
const ALTURA_GRAFICO = 260

/** Tick de linha única — o tick padrão do Recharts junta os `<tspan>` e vira
 *  "Emandamento" no DOM (ruim para leitor de tela). */
function TickCategoria({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fontSize={12} fill={CROMO.eixo}>
      {payload?.value}
    </text>
  )
}

/** "2026-07" -> "jul/26" */
export function mesCurto(mes: string): string {
  const [ano, m] = mes.split('-')
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  return `${nomes[Number(m) - 1]}/${ano.slice(2)}`
}

export function num(valor: number | null, casas = 1): string {
  return valor === null ? '—' : valor.toFixed(casas).replace('.', ',')
}

/**
 * Corpo visual do dashboard (KPIs + gráficos), sem os filtros nem o PageWrapper.
 * Fonte única: a tela do dashboard e o relatório gerencial renderizam o mesmo.
 * `variante='relatorio'` tira o botão Gráfico/Tabela dos cards (não dá para
 * alternar no papel).
 */
export function DashboardConteudo({
  data,
  variante = 'tela',
  className,
}: {
  data: DashboardResponse
  variante?: 'tela' | 'relatorio'
  className?: string
}) {
  const varCard = variante === 'relatorio' ? 'relatorio' : 'interativo'
  const { kpis, por_tipo_visita, conversao_novos_clientes, chamados_por_status, volume_por_mes } = data

  const dadosStatus = chamados_por_status.map((s) => ({
    nome: ROTULO_STATUS[s.status],
    quantidade: s.quantidade,
    cor: COR_STATUS[s.status],
  }))
  const totalTipos = por_tipo_visita.reduce((soma, t) => soma + t.quantidade, 0)
  const dadosVolume = volume_por_mes.map((v) => ({
    mes: mesCurto(v.mes),
    NOVO_CLIENTE: v.novo_cliente,
    RENOVACAO: v.renovacao,
    VISITA_TECNICA: v.visita_tecnica,
  }))
  const dadosTecnicos = data.tempo_medio_por_tecnico.map((t) => ({
    nome: t.tecnico_nome,
    horas: t.media_duracao_horas ?? 0,
    visitas: t.total_visitas,
  }))

  return (
    <div className={cn('space-y-6', className)}>
      {/* ---------- KPIs ---------- */}
      <section aria-label="Indicadores">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile label="Chamados abertos" valor={kpis.total_abertos} nota="Pendentes + em andamento, agora" icone={<ClipboardList className="h-4 w-4" aria-hidden />} />
          <StatTile label="Visitas no mês" valor={kpis.visitas_mes_atual} nota="Concluídas no mês corrente" icone={<MapPin className="h-4 w-4" aria-hidden />} />
          <StatTile label="A vencer em 15 dias" valor={kpis.a_vencer_15_dias} nota="Pendentes com data próxima" icone={<CalendarClock className="h-4 w-4" aria-hidden />} />
          <StatTile label="Abertura → visita" valor={num(kpis.tempo_medio_abertura_visita_dias, 1)} unidade="dias" nota="Média no período" icone={<Clock className="h-4 w-4" aria-hidden />} />
          <StatTile label="Duração da visita" valor={num(kpis.tempo_medio_duracao_visita_horas, 1)} unidade="h" nota="Média no período" icone={<Timer className="h-4 w-4" aria-hidden />} />
          <StatTile label="Visita → exportação" valor={num(kpis.tempo_medio_finalizacao_exportacao_dias, 1)} unidade="dias" nota="Média no período" icone={<Clock className="h-4 w-4" aria-hidden />} />
        </div>
        <p className="mt-2 text-xs text-content-secondary">
          Chamados abertos, visitas no mês e a vencer refletem a situação atual e não usam o
          filtro de período. As médias, sim.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------- STATUS ---------- */}
        <CardGrafico
          titulo="Chamados por status"
          descricao="Distribuição atual da carteira."
          variante={varCard}
          tabela={
            <TabelaDados colunas={['Status', 'Chamados']} linhas={dadosStatus.map((s) => [s.nome, s.quantidade])} />
          }
        >
          <ResponsiveContainer width="100%" height={ALTURA_GRAFICO}>
            <BarChart data={dadosStatus} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 8 }}>
              <CartesianGrid horizontal={false} stroke={CROMO.grade} />
              <XAxis type="number" tick={EIXO} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="nome" tick={<TickCategoria />} axisLine={false} tickLine={false} width={104} />
              <Tooltip content={<TooltipGrafico />} cursor={{ fill: CROMO.grade, opacity: 0.4 }} />
              <Bar dataKey="quantidade" name="Chamados" radius={[0, 4, 4, 0]} maxBarSize={24}>
                {dadosStatus.map((s) => (
                  <Cell key={s.nome} fill={s.cor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardGrafico>

        {/* ---------- TIPO DE VISITA ---------- */}
        <CardGrafico
          titulo="Distribuição por tipo de visita"
          descricao="Participação de cada tipo no período."
          variante={varCard}
          tabela={
            <TabelaDados
              colunas={['Tipo', 'Chamados', '%']}
              linhas={por_tipo_visita.map((t) => [
                ROTULO_TIPO_VISITA[t.tipo_visita],
                t.quantidade,
                `${t.percentual.toFixed(1).replace('.', ',')}%`,
              ])}
            />
          }
        >
          {totalTipos === 0 ? (
            <p className="py-16 text-center text-sm text-content-secondary">Nenhum chamado no período.</p>
          ) : (
            <div className="py-4">
              <div
                className="flex h-8 gap-0.5 overflow-hidden rounded-lg"
                role="img"
                aria-label={por_tipo_visita.map((t) => `${ROTULO_TIPO_VISITA[t.tipo_visita]}: ${t.percentual.toFixed(0)}%`).join(', ')}
              >
                {ORDEM_TIPO_VISITA.map((tipo) => {
                  const item = por_tipo_visita.find((t) => t.tipo_visita === tipo)
                  if (!item || item.quantidade === 0) return null
                  return (
                    <div
                      key={tipo}
                      style={{ width: `${item.percentual}%`, backgroundColor: COR_TIPO_VISITA[tipo] }}
                      className="first:rounded-l-lg last:rounded-r-lg"
                      title={`${ROTULO_TIPO_VISITA[tipo]}: ${item.quantidade}`}
                    />
                  )
                })}
              </div>
              <ul className="mt-4 space-y-2">
                {ORDEM_TIPO_VISITA.map((tipo) => {
                  const item = por_tipo_visita.find((t) => t.tipo_visita === tipo)
                  return (
                    <li key={tipo} className="flex items-center gap-2 text-sm">
                      <span aria-hidden className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: COR_TIPO_VISITA[tipo] }} />
                      <span className="text-content-secondary">{ROTULO_TIPO_VISITA[tipo]}</span>
                      <span className="ml-auto font-medium tabular-nums text-content">{item?.quantidade ?? 0}</span>
                      <span className="w-12 text-right tabular-nums text-content-secondary">{(item?.percentual ?? 0).toFixed(0)}%</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </CardGrafico>
      </div>

      {/* ---------- VOLUME POR MÊS ---------- */}
      <CardGrafico
        titulo="Visitas concluídas por mês"
        descricao="Últimos 6 meses, por tipo de visita. Sempre a janela completa — não usa o filtro de período."
        variante={varCard}
        tabela={
          <TabelaDados
            colunas={['Mês', 'Novo Cliente', 'Renovação', 'Visita Técnica', 'Total']}
            linhas={volume_por_mes.map((v) => [mesCurto(v.mes), v.novo_cliente, v.renovacao, v.visita_tecnica, v.total])}
          />
        }
      >
        <ResponsiveContainer width="100%" height={ALTURA_GRAFICO}>
          <BarChart data={dadosVolume} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
            <CartesianGrid vertical={false} stroke={CROMO.grade} />
            <XAxis dataKey="mes" tick={EIXO} axisLine={false} tickLine={false} />
            <YAxis tick={EIXO} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<TooltipGrafico />} cursor={{ fill: CROMO.grade, opacity: 0.4 }} />
            <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, color: CROMO.eixo, paddingTop: 8 }} />
            {ORDEM_TIPO_VISITA.map((tipo, i) => (
              <Bar
                key={tipo}
                dataKey={tipo}
                name={ROTULO_TIPO_VISITA[tipo]}
                stackId="volume"
                fill={COR_TIPO_VISITA[tipo]}
                maxBarSize={24}
                stroke={CROMO.superficie}
                strokeWidth={2}
                radius={i === ORDEM_TIPO_VISITA.length - 1 ? [4, 4, 0, 0] : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardGrafico>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------- TEMPO POR TÉCNICO ---------- */}
        <CardGrafico
          titulo="Duração média por técnico"
          descricao="Horas por visita concluída."
          variante={varCard}
          tabela={
            <TabelaDados
              colunas={['Técnico', 'Visitas', 'Média (h)']}
              linhas={data.tempo_medio_por_tecnico.map((t) => [t.tecnico_nome, t.total_visitas, num(t.media_duracao_horas, 1)])}
            />
          }
        >
          {dadosTecnicos.length === 0 ? (
            <p className="py-16 text-center text-sm text-content-secondary">Nenhuma visita concluída no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={ALTURA_GRAFICO}>
              <BarChart data={dadosTecnicos} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 8 }}>
                <CartesianGrid horizontal={false} stroke={CROMO.grade} />
                <XAxis type="number" tick={EIXO} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="nome" tick={<TickCategoria />} axisLine={false} tickLine={false} width={140} />
                <Tooltip content={<TooltipGrafico />} cursor={{ fill: CROMO.grade, opacity: 0.4 }} />
                <Bar dataKey="horas" name="Média (h)" fill={COR_MAGNITUDE} radius={[0, 4, 4, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardGrafico>

        {/* ---------- CONVERSÃO + CARGA ---------- */}
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-surface p-4 shadow-card">
            <h2 className="mb-3 font-semibold tracking-tightish text-content">Conversão de novos clientes</h2>
            <Meter
              percentual={conversao_novos_clientes.percentual}
              rotulo="Visitas concluídas"
              detalhe={`${conversao_novos_clientes.concluidos} de ${conversao_novos_clientes.total} chamados abertos como Novo Cliente no período.`}
            />
            <p className="mt-3 text-xs text-content-secondary">Sempre sobre Novo Cliente — não usa o filtro de tipo de visita.</p>
          </section>

          <CardGrafico
            titulo="PGRs pendentes de exportação"
            descricao="Carga atual de cada técnico interno."
            variante={varCard}
            tabela={
              <TabelaDados
                colunas={['Técnico interno', 'Pendentes']}
                linhas={data.carga_tecnicos_internos.map((t) => [t.tecnico_nome, t.pendentes_exportacao])}
              />
            }
          >
            {data.carga_tecnicos_internos.length === 0 ? (
              <p className="py-8 text-center text-sm text-content-secondary">Nenhum PGR pendente de exportação.</p>
            ) : (
              <ul className="space-y-3">
                {data.carga_tecnicos_internos.map((t) => (
                  <li key={t.tecnico_id} className="flex items-center gap-3 text-sm">
                    <span className="w-32 shrink-0 truncate text-content-secondary">{t.tecnico_nome}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-accent">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          backgroundColor: COR_MAGNITUDE,
                          width: `${(t.pendentes_exportacao / Math.max(...data.carga_tecnicos_internos.map((x) => x.pendentes_exportacao))) * 100}%`,
                        }}
                      />
                    </span>
                    <span className="w-6 text-right font-medium tabular-nums text-content">{t.pendentes_exportacao}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardGrafico>
        </div>
      </div>
    </div>
  )
}
