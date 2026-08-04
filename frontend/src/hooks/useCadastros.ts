import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as service from '@/services/cadastroService'
import type {
  ClienteCreate,
  ClienteUpdate,
  FiltrosCliente,
  FiltrosUnidade,
  FiltrosUsuario,
  UnidadeCreate,
  UnidadeUpdate,
  UsuarioCreate,
  UsuarioUpdate,
} from '@/types/cadastros'

// ---------- Clientes ----------
export function useClientes(filtros: FiltrosCliente) {
  return useQuery({
    queryKey: ['clientes', filtros],
    queryFn: () => service.listarClientes(filtros),
    placeholderData: keepPreviousData,
  })
}
export function useCliente(id: string | undefined) {
  return useQuery({
    queryKey: ['cliente', id],
    queryFn: () => service.obterCliente(id!),
    enabled: Boolean(id),
  })
}
export function useCriarCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ClienteCreate) => service.criarCliente(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clientes'] }),
  })
}
export function useAtualizarCliente(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ClienteUpdate) => service.atualizarCliente(id, body),
    onSuccess: (dados) => {
      qc.setQueryData(['cliente', id], dados)
      void qc.invalidateQueries({ queryKey: ['clientes'] })
    },
  })
}

// ---------- Usuários ----------
export function useUsuarios(filtros: FiltrosUsuario) {
  return useQuery({
    queryKey: ['usuarios', filtros],
    queryFn: () => service.listarUsuarios(filtros),
    placeholderData: keepPreviousData,
  })
}
export function useUsuario(id: string | undefined) {
  return useQuery({
    queryKey: ['usuario', id],
    queryFn: () => service.obterUsuario(id!),
    enabled: Boolean(id),
  })
}
export function useCriarUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UsuarioCreate) => service.criarUsuario(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}
export function useAtualizarUsuario(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UsuarioUpdate) => service.atualizarUsuario(id, body),
    onSuccess: (dados) => {
      qc.setQueryData(['usuario', id], dados)
      void qc.invalidateQueries({ queryKey: ['usuarios'] })
      // Técnicos/gestores alimentam selects de outras telas.
      void qc.invalidateQueries({ queryKey: ['tecnicos'] })
    },
  })
}

// ---------- Unidades ----------
export function useUnidades(filtros: FiltrosUnidade) {
  return useQuery({
    queryKey: ['unidades', filtros],
    queryFn: () => service.listarUnidades(filtros),
    placeholderData: keepPreviousData,
  })
}
export function useUnidade(id: string | undefined) {
  return useQuery({
    queryKey: ['unidade', id],
    queryFn: () => service.obterUnidade(id!),
    enabled: Boolean(id),
  })
}
export function useCriarUnidade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UnidadeCreate) => service.criarUnidade(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['unidades'] }),
  })
}
export function useAtualizarUnidade(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UnidadeUpdate) => service.atualizarUnidade(id, body),
    onSuccess: (dados) => {
      qc.setQueryData(['unidade', id], dados)
      void qc.invalidateQueries({ queryKey: ['unidades'] })
    },
  })
}

// ---------- Listas de apoio ----------
export function useUnidadesAtivas() {
  return useQuery({
    queryKey: ['unidades', 'ativas'],
    queryFn: service.listarUnidadesAtivas,
    staleTime: 5 * 60 * 1000,
  })
}
export function useGestores() {
  return useQuery({
    queryKey: ['gestores'],
    queryFn: service.listarGestores,
    staleTime: 5 * 60 * 1000,
  })
}
