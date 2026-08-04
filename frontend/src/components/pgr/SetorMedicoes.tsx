import { medicoesDoSetor } from '@/lib/pgr'
import type { Setor } from '@/types/visita'

/** Máquinas e medições do setor, em leitura. Reusado na conferência e no relatório. */
export function SetorMedicoes({ setor }: { setor: Setor }) {
  const medicoes = medicoesDoSetor(setor)
  if (!setor.maquinas && medicoes.length === 0) return null
  return (
    <div className="space-y-1 text-sm">
      {setor.maquinas && (
        <p className="text-content-secondary">
          <span className="font-medium text-content">Máquinas:</span> {setor.maquinas}
        </p>
      )}
      {medicoes.length > 0 && (
        <p className="text-content-secondary">
          <span className="font-medium text-content">Medições:</span> {medicoes.join(' · ')}
        </p>
      )}
    </div>
  )
}
