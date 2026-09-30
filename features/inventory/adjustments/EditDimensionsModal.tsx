import React, { useState } from 'react'
import { Modal } from '@/design-system/modals/Modal'
import { Button } from '@/design-system/buttons'
import { Input, Select } from '@/design-system/inputs'
import { AdjustmentRow, BoxDimensions } from '@/services/api/inventoryAdjustments.api'

type Field = 'unitsPerBox' | 'length' | 'width' | 'height' | 'weight'
type Draft = Record<Field, string> & { dimensionUnit: BoxDimensions['dimensionUnit']; weightUnit: BoxDimensions['weightUnit'] }

const FIELDS: { field: Field; label: string; integer?: boolean }[] = [
  { field: 'unitsPerBox', label: 'Units per box', integer: true },
  { field: 'length', label: 'Length' },
  { field: 'width', label: 'Width' },
  { field: 'height', label: 'Height' },
  { field: 'weight', label: 'Weight' },
]

const toDraft = (box: BoxDimensions | null): Draft => ({
  unitsPerBox: box ? String(box.unitsPerBox) : '',
  length: box ? String(box.length) : '',
  width: box ? String(box.width) : '',
  height: box ? String(box.height) : '',
  weight: box ? String(box.weight) : '',
  dimensionUnit: box?.dimensionUnit ?? 'IN',
  weightUnit: box?.weightUnit ?? 'LB',
})

const isValid = (draft: Draft, { field, integer }: (typeof FIELDS)[number]) => {
  const value = Number(draft[field])
  return draft[field].trim() !== '' && value > 0 && (!integer || Number.isInteger(value))
}

interface FormProps {
  row: AdjustmentRow
  saving: boolean
  error: string | null
  onSave: (row: AdjustmentRow, box: BoxDimensions) => void
  onClose: () => void
}

export const EditDimensionsModal: React.FC<Omit<FormProps, 'row'> & { row: AdjustmentRow | null }> = ({ row, ...rest }) => (
  <Modal isOpen={row !== null} onClose={rest.onClose} title="Box dimensions" size="md">
    {row && <Form key={row.id} row={row} {...rest} />}
  </Modal>
)

const Form: React.FC<FormProps> = ({ row, saving, error, onSave, onClose }) => {
  const [draft, setDraft] = useState<Draft>(() => toDraft(row.boxDimensions))
  const [touched, setTouched] = useState(false)
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const submit = () => {
    setTouched(true)
    if (!FIELDS.every((f) => isValid(draft, f))) return
    onSave(row, {
      unitsPerBox: Number(draft.unitsPerBox),
      length: Number(draft.length),
      width: Number(draft.width),
      height: Number(draft.height),
      dimensionUnit: draft.dimensionUnit,
      weight: Number(draft.weight),
      weightUnit: draft.weightUnit,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="font-medium text-text-primary">{row.description}</div>
        <div className="font-mono text-sm text-text-muted">{row.sku}</div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <Input
            key={f.field}
            label={f.label}
            type="number"
            min={0}
            step={f.integer ? 1 : 0.01}
            value={draft[f.field]}
            onChange={(e) => set({ [f.field]: e.target.value })}
            error={touched && !isValid(draft, f) ? 'Required, greater than 0' : undefined}
          />
        ))}
        <Select
          label="Size unit"
          value={draft.dimensionUnit}
          onChange={(e) => set({ dimensionUnit: e.target.value as Draft['dimensionUnit'] })}
          options={[
            { value: 'IN', label: 'Inches' },
            { value: 'CM', label: 'Centimetres' },
          ]}
        />
        <Select
          label="Weight unit"
          value={draft.weightUnit}
          onChange={(e) => set({ weightUnit: e.target.value as Draft['weightUnit'] })}
          options={[
            { value: 'LB', label: 'Pounds' },
            { value: 'KG', label: 'Kilograms' },
          ]}
        />
      </div>

      {error && <p className="text-sm text-danger-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={saving}>
          {saving ? 'Saving…' : 'Save dimensions'}
        </Button>
      </div>
    </div>
  )
}
