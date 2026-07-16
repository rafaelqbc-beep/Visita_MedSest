import { useEffect, useState } from 'react'

/**
 * Acompanha a conexão do navegador.
 *
 * ⚠️ `navigator.onLine` só garante que existe uma interface de rede ativa —
 * um tablet conectado a um Wi-Fi sem internet aparece como "online". Para o
 * indicador do cabeçalho isso basta; o módulo offline (sessão #14) deve
 * confirmar com uma chamada real à API antes de sincronizar.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const ficouOnline = () => setOnline(true)
    const ficouOffline = () => setOnline(false)

    window.addEventListener('online', ficouOnline)
    window.addEventListener('offline', ficouOffline)
    return () => {
      window.removeEventListener('online', ficouOnline)
      window.removeEventListener('offline', ficouOffline)
    }
  }, [])

  return online
}
