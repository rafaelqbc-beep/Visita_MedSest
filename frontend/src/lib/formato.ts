import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Datas do backend vêm em UTC; o usuário lê em America/Sao_Paulo.
 * O navegador do técnico já está nesse fuso, então `parseISO` + `format`
 * convertem sozinhos para o horário local.
 */
export function dataHora(iso: string | null | undefined): string {
  if (!iso) return '—'
  return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

/** `data_proposta` é um DATE puro (sem fuso) — tratar como UTC evita o
 *  clássico "a data volta um dia" em fusos negativos. */
export function data(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [ano, mes, dia] = iso.split('-').map(Number)
  return format(new Date(ano, mes - 1, dia), 'dd/MM/yyyy', { locale: ptBR })
}
