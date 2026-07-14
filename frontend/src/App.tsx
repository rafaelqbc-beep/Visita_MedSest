import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

/**
 * Estrutura de rotas — placeholder da sessão #1.
 * As páginas reais (auth, dashboard, chamados, visita, validação, admin)
 * serão adicionadas nas próximas sessões.
 */
function PlaceholderHome() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-2xl font-semibold text-white">
        MS
      </div>
      <h1 className="text-2xl font-semibold text-primary">MedSest Visita</h1>
      <p className="max-w-md text-content-secondary">
        Fundação do projeto instalada. Design system, rotas e PWA configurados. As telas
        do sistema serão implementadas nas próximas sessões de desenvolvimento.
      </p>
      <span className="rounded-lg bg-info-bg px-3 py-1 text-sm font-medium text-info">
        Sessão #1 — Setup concluído
      </span>
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
