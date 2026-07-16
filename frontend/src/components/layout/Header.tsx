import { useState } from 'react'
import { LogOut, Menu } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { useAuth } from '@/hooks/useAuth'

interface HeaderProps {
  onAbrirMenu: () => void
}

export function Header({ onAbrirMenu }: HeaderProps) {
  const { usuario, sair } = useAuth()
  const [saindo, setSaindo] = useState(false)

  async function aoSair() {
    setSaindo(true)
    try {
      await sair()
    } finally {
      setSaindo(false)
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-surface px-4 sm:px-6">
      <button
        type="button"
        onClick={onAbrirMenu}
        aria-label="Abrir menu"
        className="flex h-11 w-11 items-center justify-center rounded-lg text-content-label
          transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-primary lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      <div className="ml-auto flex items-center gap-3">
        <OfflineIndicator />

        {/* O nome já aparece na sidebar; aqui é atalho no desktop, onde a
            sidebar pode estar fora do campo de visão. */}
        <span className="hidden text-sm text-content-secondary lg:inline">{usuario?.nome}</span>

        <Button variante="secondary" onClick={() => void aoSair()} carregando={saindo}>
          <LogOut className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </div>
    </header>
  )
}
