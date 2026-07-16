import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { itensPara, ROTULO_ROLE } from '@/lib/navegacao'

interface SidebarProps {
  /** Estado do drawer — só tem efeito abaixo de lg. */
  aberta: boolean
  onFechar: () => void
}

export function Sidebar({ aberta, onFechar }: SidebarProps) {
  const { usuario } = useAuth()
  const itens = itensPara(usuario?.role)
  const refFechar = useRef<HTMLButtonElement>(null)

  // Esc fecha o drawer: no tablet o overlay cobre a tela e prender o usuário
  // seria péssimo.
  useEffect(() => {
    if (!aberta) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    refFechar.current?.focus()
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aberta, onFechar])

  return (
    <>
      {/* Overlay do drawer (só no tablet/celular) */}
      {aberta && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onFechar}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-sidebar flex-col bg-sidebar-bg',
          'transition-transform duration-200 lg:translate-x-0',
          aberta ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Navegação principal"
      >
        {/* Marca. O logo completo tem "Med" em azul-marinho e sumiria neste
            fundo; por isso vai o símbolo (que tem contorno branco) + texto. */}
        <div className="flex h-16 shrink-0 items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-3">
            <img src="/simbolo-medsest.svg" alt="" className="h-8 w-auto" />
            <span className="font-semibold tracking-tightish text-sidebar-text">
              MedSest Visita
            </span>
          </div>
          <button
            ref={refFechar}
            type="button"
            onClick={onFechar}
            aria-label="Fechar menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-sidebar-muted
              transition-colors hover:bg-white/10 hover:text-sidebar-text focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-white/60 lg:hidden"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {itens.map(({ rotulo, para, icone: Icone }) => (
            <NavLink
              key={para}
              to={para}
              onClick={onFechar}
              className={({ isActive }) =>
                cn(
                  'flex min-h-touch items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                  'transition-colors focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-white/60',
                  isActive
                    ? 'bg-white/15 text-sidebar-text'
                    : 'text-sidebar-muted hover:bg-white/10 hover:text-sidebar-text',
                )
              }
            >
              <Icone className="h-5 w-5 shrink-0" aria-hidden />
              {rotulo}
            </NavLink>
          ))}
        </nav>

        {/* Identificação do usuário: em campo, com tablets compartilhados,
            saber quem está logado evita registro no nome errado. */}
        <div className="shrink-0 border-t border-white/10 px-4 py-3">
          <p className="truncate text-sm font-medium text-sidebar-text">{usuario?.nome}</p>
          <p className="truncate text-xs text-sidebar-muted">
            {usuario ? ROTULO_ROLE[usuario.role] : ''}
          </p>
        </div>
      </aside>
    </>
  )
}
