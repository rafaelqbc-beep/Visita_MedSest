import type { StatusChamado, TipoVisita } from '@/types'

/**
 * Paleta dos gráficos — VALIDADA, não escolhida no olho.
 *
 * Rodada em `scripts/validate_palette.js` (skill dataviz) contra a superfície
 * branca dos cards. O que a validação revelou e que o olho não pegaria:
 *
 * - O azul-marinho da marca (#1A3A5C) é **inválido como preenchimento**: fica
 *   fora da banda de luminosidade (L 0.34) e abaixo do piso de croma (0.071) —
 *   num gráfico ele lê como cinza. Por isso os gráficos usam o azul médio
 *   #2E6DA4 (mesma família, luminosidade corrigida). O marinho segue na UI.
 * - Âmbar + verde, que parecem óbvios de distinguir, dão **ΔE 2.7 sob
 *   protanopia** — quase a mesma cor para quem tem daltonismo. Descartado.
 *
 * Resultado: azul da marca + verde + violeta. Passa todos os checks sem
 * nenhum warning (pior par vizinho: ΔE 20.7 CVD / 23.4 visão normal; todos
 * ≥ 3:1 de contraste).
 */

/**
 * Tipo de visita — categórico (identidade). A mesma cor em todos os gráficos:
 * quem aprendeu "Novo Cliente é azul" não pode ver outra coisa em outro card.
 *
 * ⚠️ A ORDEM É ESTRUTURAL, não estética. O verde precisa ficar ENTRE o azul e
 * o violeta: azul↔violeta sozinhos dão ΔE 13.4 (abaixo do piso de 15) e só não
 * quebram porque nunca se tocam numa pilha. Trocar a ordem, ou usar estas cores
 * numa forma onde todos os segmentos se tocam (pizza/donut), reprova na
 * validação.
 */
export const COR_TIPO_VISITA: Record<TipoVisita, string> = {
  NOVO_CLIENTE: '#2E6DA4', // azul da marca
  RENOVACAO: '#008300', // verde
  VISITA_TECNICA: '#4a3aa7', // violeta
}

/** Ordem obrigatória das séries nas pilhas (ver aviso acima). */
export const ORDEM_TIPO_VISITA: TipoVisita[] = [
  'NOVO_CLIENTE',
  'RENOVACAO',
  'VISITA_TECNICA',
]

/**
 * Status — token de estado, não slot categórico.
 *
 * Estas cores REPROVAM o validador categórico (vermelho↔verde ΔE 4.2 sob
 * deuteranopia). Isso é esperado e não é defeito: a paleta de status do próprio
 * guia reprova igual (ΔE 4.1) — status é semanticamente vermelho/verde, e
 * vermelho/verde é justamente o que o daltonismo colapsa.
 *
 * A regra que vale para status é outra: **nunca cor sozinha**. Por isso todo
 * gráfico de status aqui traz o nome e o valor ao lado da barra — quem não
 * distingue as cores lê o rótulo. É também o que mantém o gráfico falando a
 * mesma língua do `StatusBadge` nas listagens.
 */
export const COR_STATUS: Record<StatusChamado, string> = {
  PENDENTE: '#B45309',
  EM_ANDAMENTO: '#1D4ED8',
  FINALIZADO: '#15803D',
  CANCELADO: '#B91C1C',
}

/**
 * Hue única para comparação de magnitude (tempo por técnico, carga dos
 * internos). Categorias nominais NÃO ganham uma cor cada: isso gastaria o
 * canal de identidade recodificando o que o comprimento da barra já mostra.
 */
export const COR_MAGNITUDE = '#2E6DA4'

/** Cromo dos gráficos — recessivo, um passo fora da superfície. */
export const CROMO = {
  grade: '#E5E7EB',
  eixo: '#6B7280',
  superficie: '#FFFFFF',
} as const

export const ROTULO_TIPO_VISITA: Record<TipoVisita, string> = {
  NOVO_CLIENTE: 'Novo Cliente',
  RENOVACAO: 'Renovação',
  VISITA_TECNICA: 'Visita Técnica',
}

export const ROTULO_STATUS: Record<StatusChamado, string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
}
