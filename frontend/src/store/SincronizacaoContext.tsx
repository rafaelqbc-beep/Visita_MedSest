import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { tamanhoFila } from '@/lib/offline/fila'
import { conexaoReal, sincronizar } from '@/lib/offline/sync'

type Estado = 'ocioso' | 'sincronizando' | 'erro'

interface SincronizacaoCtx {
  /** Operações ainda não enviadas ao servidor. */
  pendentes: number
  estado: Estado
  /** Conexão de rede do navegador (para o rótulo; pode mentir — ver useOnlineStatus). */
  online: boolean
  /** Dispara a sincronização manualmente (ex.: botão "tentar de novo"). */
  sincronizarAgora: () => void
}

const Ctx = createContext<SincronizacaoCtx>({
  pendentes: 0,
  estado: 'ocioso',
  online: true,
  sincronizarAgora: () => {},
})

export function SincronizacaoProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient()
  const online = useOnlineStatus()
  const [pendentes, setPendentes] = useState(0)
  const [estado, setEstado] = useState<Estado>('ocioso')
  const rodando = useRef(false)

  const atualizarPendentes = useCallback(async () => {
    setPendentes(await tamanhoFila())
  }, [])

  const executar = useCallback(async () => {
    if (rodando.current) return
    if ((await tamanhoFila()) === 0) return
    if (!(await conexaoReal())) return // navigator.onLine mente; confirma de verdade
    rodando.current = true
    setEstado('sincronizando')
    try {
      const r = await sincronizar()
      // Releitura autoritativa: os ids locais viram reais no espelho.
      for (const cid of r.chamadosAfetados) {
        void qc.invalidateQueries({ queryKey: ['setores', cid] })
        void qc.invalidateQueries({ queryKey: ['chamado', cid] })
      }
      void qc.invalidateQueries({ queryKey: ['chamados'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
      setEstado(r.erro ? 'erro' : 'ocioso')
    } catch {
      setEstado('erro')
    } finally {
      rodando.current = false
      await atualizarPendentes()
    }
  }, [qc, atualizarPendentes])

  // Conta inicial e a cada mudança na outbox (evento disparado por fila.ts).
  useEffect(() => {
    void atualizarPendentes()
    const aoMudar = () => void atualizarPendentes()
    window.addEventListener('medsest:fila', aoMudar)
    return () => window.removeEventListener('medsest:fila', aoMudar)
  }, [atualizarPendentes])

  // Ao (re)conectar e ao montar: tenta sincronizar o que estiver pendente.
  useEffect(() => {
    if (online) void executar()
  }, [online, executar])

  return (
    <Ctx.Provider value={{ pendentes, estado, online, sincronizarAgora: () => void executar() }}>
      {children}
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSincronizacao(): SincronizacaoCtx {
  return useContext(Ctx)
}
