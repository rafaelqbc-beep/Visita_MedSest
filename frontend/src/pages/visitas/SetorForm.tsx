import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import type { Setor, SetorCampos } from '@/types/visita'

interface Props {
  /** Setor existente ao editar; ausente ao criar. */
  inicial?: Setor
  onSalvar: (campos: SetorCampos) => Promise<void> | void
  onCancelar: () => void
  carregando: boolean
  rotuloSalvar: string
}

/** '87,5' ou '87.5' → 87.5; vazio → null. */
function paraNumero(v: string): number | null {
  const limpo = v.trim().replace(',', '.')
  if (limpo === '') return null
  const n = Number(limpo)
  return Number.isNaN(n) ? null : n
}

/** Medição em campo numérico com unidade encostada. */
function CampoMedicao({
  id,
  label,
  unidade,
  valor,
  onChange,
}: {
  id: string
  label: string
  unidade: string
  valor: string
  onChange: (v: string) => void
}) {
  return (
    <FormField label={label} htmlFor={id}>
      <Input
        id={id}
        value={valor}
        // Aceita dígitos e um separador decimal (vírgula ou ponto).
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
        inputMode="decimal"
        placeholder="—"
        sufixo={<span className="pr-3 text-sm text-content-secondary">{unidade}</span>}
      />
    </FormField>
  )
}

export function SetorForm({ inicial, onSalvar, onCancelar, carregando, rotuloSalvar }: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [ambiente, setAmbiente] = useState(inicial?.descricao_ambiente ?? '')
  const [maquinas, setMaquinas] = useState(inicial?.maquinas ?? '')
  const [ruido, setRuido] = useState(inicial?.ruido_db ?? '')
  const [calor, setCalor] = useState(inicial?.calor_ibutg ?? '')
  const [lux, setLux] = useState(inicial?.iluminancia_lux ?? '')
  const [erro, setErro] = useState(false)

  function salvar() {
    if (!nome.trim()) {
      setErro(true)
      return
    }
    setErro(false)
    void onSalvar({
      nome: nome.trim(),
      descricao_ambiente: ambiente.trim() || null,
      maquinas: maquinas.trim() || null,
      ruido_db: paraNumero(ruido),
      calor_ibutg: paraNumero(calor),
      iluminancia_lux: paraNumero(lux),
    })
  }

  return (
    <div className="space-y-4">
      <FormField label="Nome do setor" htmlFor="setor-nome" erro={erro ? 'Informe o nome do setor.' : undefined}>
        <Input
          id="setor-nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Produção, Almoxarifado, Recepção"
          erro={erro}
          autoFocus
        />
      </FormField>

      <FormField label="Descrição do ambiente" htmlFor="setor-ambiente">
        <Textarea
          id="setor-ambiente"
          rows={3}
          value={ambiente}
          onChange={(e) => setAmbiente(e.target.value)}
          placeholder="Condições do local: iluminação, ventilação, layout (opcional)."
        />
      </FormField>

      <FormField label="Máquinas e equipamentos" htmlFor="setor-maquinas">
        <Textarea
          id="setor-maquinas"
          rows={2}
          value={maquinas}
          onChange={(e) => setMaquinas(e.target.value)}
          placeholder="Máquinas e equipamentos do setor (opcional)."
        />
      </FormField>

      <div>
        <p className="mb-2 text-sm font-medium text-content-label">Medições (opcional)</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <CampoMedicao id="setor-ruido" label="Ruído" unidade="dB(A)" valor={ruido} onChange={setRuido} />
          <CampoMedicao id="setor-calor" label="Calor" unidade="°C IBUTG" valor={calor} onChange={setCalor} />
          <CampoMedicao id="setor-lux" label="Iluminância" unidade="lux" valor={lux} onChange={setLux} />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <Button variante="action" className="w-full sm:w-auto" onClick={salvar} carregando={carregando}>
          {rotuloSalvar}
        </Button>
        <Button variante="secondary" className="w-full sm:w-auto" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
