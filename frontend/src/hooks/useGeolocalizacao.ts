import { useCallback, useState } from 'react'
import type { Geolocalizacao } from '@/types/visita'

const SEM_LOCALIZACAO: Geolocalizacao = { latitude: null, longitude: null }

/**
 * Captura a posição do tablet.
 *
 * ⚠️ NUNCA rejeita. A geolocalização é opcional no backend de propósito: se o
 * técnico negar a permissão, estiver num galpão sem GPS ou o aparelho demorar,
 * a visita precisa começar mesmo assim. Falha vira `{null, null}`, não erro.
 */
export function useGeolocalizacao() {
  const [obtendo, setObtendo] = useState(false)

  const obter = useCallback(async (): Promise<Geolocalizacao> => {
    if (!navigator.geolocation) return SEM_LOCALIZACAO

    setObtendo(true)
    try {
      return await new Promise<Geolocalizacao>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => resolve(SEM_LOCALIZACAO),
          // Timeout curto: o técnico está com o cliente esperando. Um GPS que
          // demora 30s não pode segurar o início da visita.
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
        )
      })
    } finally {
      setObtendo(false)
    }
  }, [])

  return { obter, obtendo }
}
