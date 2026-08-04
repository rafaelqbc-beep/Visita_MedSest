import { useEffect, useState } from 'react'

/** Evento não-padrão do Chrome/Android que oferece a instalação do PWA. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Instalação do app (adicionar à tela inicial).
 *
 * `beforeinstallprompt` só dispara no Chrome/Android/desktop — no iOS a
 * instalação é manual (Compartilhar → Adicionar à Tela de Início), então lá o
 * botão simplesmente não aparece.
 */
export function useInstalarApp() {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null)
  const [instalado, setInstalado] = useState(false)

  useEffect(() => {
    const aoOferecer = (e: Event) => {
      e.preventDefault() // impede o mini-infobar padrão; mostramos nosso botão
      setEvento(e as BeforeInstallPromptEvent)
    }
    const aoInstalar = () => {
      setInstalado(true)
      setEvento(null)
    }
    window.addEventListener('beforeinstallprompt', aoOferecer)
    window.addEventListener('appinstalled', aoInstalar)
    return () => {
      window.removeEventListener('beforeinstallprompt', aoOferecer)
      window.removeEventListener('appinstalled', aoInstalar)
    }
  }, [])

  async function instalar(): Promise<void> {
    if (!evento) return
    await evento.prompt()
    // Uma oferta só pode ser usada uma vez.
    setEvento(null)
  }

  return { podeInstalar: Boolean(evento) && !instalado, instalar }
}
