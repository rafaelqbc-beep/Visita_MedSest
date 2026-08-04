import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as service from '@/services/visitaService'
import type { ChamadoListItem } from '@/types/chamado'
import type {
  Cargo,
  CargoCreate,
  CargoUpdate,
  Foto,
  Geolocalizacao,
  Setor,
  SetorCreate,
  SetorUpdate,
} from '@/types/visita'

/** Setores do chamado, com cargos e fotos aninhados. */
export function useSetores(chamadoId: string | undefined) {
  return useQuery({
    queryKey: ['setores', chamadoId],
    queryFn: () => service.listarSetores(chamadoId!),
    enabled: Boolean(chamadoId),
    // 'always': o React Query pausaria offline (networkMode padrão 'online'); aqui
    // o service resolve o offline (cai no espelho), então a função deve sempre rodar.
    networkMode: 'always',
  })
}

export function useIniciarVisita(chamadoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (geo: Geolocalizacao) => service.iniciarVisita(chamadoId, geo),
    onSuccess: (dados) => {
      qc.setQueryData(['chamado', chamadoId], dados)
      void qc.invalidateQueries({ queryKey: ['chamados'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

/**
 * Todas as mutações de setor/cargo/foto invalidam a MESMA query: o GET de
 * setores traz tudo aninhado, então uma releitura repõe a tela inteira. Evita
 * ter que sincronizar o cache campo a campo.
 */
function useMutacaoDaVisita<TVars, TResultado = void>(
  chamadoId: string,
  fn: (vars: TVars) => Promise<TResultado>,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    // 'always': sem isto o React Query PAUSA a mutação offline e a função (que
    // trata o offline por dentro: espelho + fila) nunca roda.
    networkMode: 'always',
    onSuccess: () => qc.invalidateQueries({ queryKey: ['setores', chamadoId] }),
  })
}

export function useCriarSetor(chamadoId: string) {
  // criarSetor lê o chamado_id do próprio body.
  return useMutacaoDaVisita<SetorCreate, Setor>(chamadoId, service.criarSetor)
}

export function useAtualizarSetor(chamadoId: string) {
  return useMutacaoDaVisita<{ id: string; body: SetorUpdate }, Setor>(chamadoId, ({ id, body }) =>
    service.atualizarSetor(chamadoId, id, body),
  )
}

export function useRemoverSetor(chamadoId: string) {
  return useMutacaoDaVisita<string>(chamadoId, (id) => service.removerSetor(chamadoId, id))
}

export function useCriarCargo(chamadoId: string) {
  return useMutacaoDaVisita<CargoCreate, Cargo>(chamadoId, (body) =>
    service.criarCargo(chamadoId, body),
  )
}

export function useAtualizarCargo(chamadoId: string) {
  return useMutacaoDaVisita<{ id: string; body: CargoUpdate }, Cargo>(chamadoId, ({ id, body }) =>
    service.atualizarCargo(chamadoId, id, body),
  )
}

export function useRemoverCargo(chamadoId: string) {
  return useMutacaoDaVisita<string>(chamadoId, (id) => service.removerCargo(chamadoId, id))
}

export function useEnviarFoto(chamadoId: string) {
  return useMutacaoDaVisita<{ setorId: string; arquivo: File; descricao?: string }, Foto>(
    chamadoId,
    ({ setorId, arquivo, descricao }) => service.enviarFoto(chamadoId, setorId, arquivo, descricao),
  )
}

export function useRemoverFoto(chamadoId: string) {
  return useMutacaoDaVisita<string>(chamadoId, (id) => service.removerFoto(chamadoId, id))
}

// --- Encerramento ---
// Estes mexem no CHAMADO, não nos setores: atualizam a query do chamado.

function useMutacaoDoChamado<TVars>(
  chamadoId: string,
  fn: (vars: TVars) => Promise<ChamadoListItem>,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (dados) => {
      qc.setQueryData(['chamado', chamadoId], dados)
      void qc.invalidateQueries({ queryKey: ['chamados'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useAssinarCliente(chamadoId: string) {
  return useMutacaoDoChamado<{ arquivo: File; nome: string; cpf: string }>(
    chamadoId,
    ({ arquivo, nome, cpf }) => service.assinarCliente(chamadoId, arquivo, nome, cpf),
  )
}

export function useAssinarTecnico(chamadoId: string) {
  return useMutacaoDoChamado<File>(chamadoId, (arquivo) =>
    service.assinarTecnico(chamadoId, arquivo),
  )
}

export function useFinalizarVisita(chamadoId: string) {
  return useMutacaoDoChamado<Geolocalizacao>(chamadoId, (geo) =>
    service.finalizarVisita(chamadoId, geo),
  )
}
