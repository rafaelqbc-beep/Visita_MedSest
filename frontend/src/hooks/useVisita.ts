import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as service from '@/services/visitaService'
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['setores', chamadoId] }),
  })
}

export function useCriarSetor(chamadoId: string) {
  return useMutacaoDaVisita<SetorCreate, Setor>(chamadoId, service.criarSetor)
}

export function useAtualizarSetor(chamadoId: string) {
  return useMutacaoDaVisita<{ id: string; body: SetorUpdate }, Setor>(chamadoId, ({ id, body }) =>
    service.atualizarSetor(id, body),
  )
}

export function useRemoverSetor(chamadoId: string) {
  return useMutacaoDaVisita<string>(chamadoId, service.removerSetor)
}

export function useCriarCargo(chamadoId: string) {
  return useMutacaoDaVisita<CargoCreate, Cargo>(chamadoId, service.criarCargo)
}

export function useAtualizarCargo(chamadoId: string) {
  return useMutacaoDaVisita<{ id: string; body: CargoUpdate }, Cargo>(chamadoId, ({ id, body }) =>
    service.atualizarCargo(id, body),
  )
}

export function useRemoverCargo(chamadoId: string) {
  return useMutacaoDaVisita<string>(chamadoId, service.removerCargo)
}

export function useEnviarFoto(chamadoId: string) {
  return useMutacaoDaVisita<{ setorId: string; arquivo: File; descricao?: string }, Foto>(
    chamadoId,
    ({ setorId, arquivo, descricao }) => service.enviarFoto(setorId, arquivo, descricao),
  )
}

export function useRemoverFoto(chamadoId: string) {
  return useMutacaoDaVisita<string>(chamadoId, service.removerFoto)
}
