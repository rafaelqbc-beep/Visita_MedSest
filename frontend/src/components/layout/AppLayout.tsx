import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'

export function AppLayout() {
  const [menuAberto, setMenuAberto] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-screen bg-background">
      <Sidebar aberta={menuAberto} onFechar={() => setMenuAberto(false)} />

      {/* A sidebar é fixed: o padding reserva o espaço dela no desktop. */}
      <div className="lg:pl-sidebar">
        <Header onAbrirMenu={() => setMenuAberto(true)} />
        {/* key na rota: a página remonta ao navegar, evitando estado vazado
            entre telas. */}
        <main key={location.pathname}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
