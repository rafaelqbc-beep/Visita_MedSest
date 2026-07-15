import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

/**
 * Estrutura de rotas — placeholder da sessão #1.
 * As páginas reais (auth, dashboard, chamados, visita, validação, admin)
 * serão adicionadas nas próximas sessões.
 */
function PlaceholderHome() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <img src="/logo_medsest.png" alt="MedSest" className="h-16" />
      <p className="max-w-md text-content-secondary">
        Backend completo. Identidade visual aplicada. As telas do sistema entram nas
        próximas sessões — a começar pela autenticação.
      </p>
      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-info-bg px-3 py-1 text-sm font-medium text-info">
          API pronta
        </span>
        <span className="rounded-lg bg-brand-green-bg px-3 py-1 text-sm font-medium text-brand-green">
          Verde da marca
        </span>
      </div>
      {/* Sidebar é azul-marinho: confere o símbolo sobre fundo escuro */}
      <div className="mt-4 flex items-center gap-3 rounded-xl bg-primary px-5 py-3">
        <img src="/simbolo-medsest.svg" alt="" className="h-8" />
        <span className="font-semibold tracking-tightish text-white">MedSest Visita</span>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PlaceholderHome />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
