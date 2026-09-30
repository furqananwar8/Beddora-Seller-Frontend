import React, { useState } from 'react'
import { Modal } from '@/design-system/modals/Modal'
import { Button } from '@/design-system/buttons'
import { Input } from '@/design-system/inputs'
import { AdjustmentRow } from '@/services/api/inventoryAdjustments.api'
import { BUCKET_ROWS } from './buckets'

const n = (value: number) => value.toLocaleString()

interface FormProps {
  row: AdjustmentRow
  saving: boolean
  error: string | null
  onSave: (row: AdjustmentRow, quantity: number) => void
  onClose: () => void
}

/**
 * Sets a SKU's on-hand quantity. On-hand is what's left after shipped FBA units and
 * processed orders, so it is only bounded below by units still held by shipments.
 */
export const EditQuantityModal: React.FC<Omit<FormProps, 'row'> & { row: AdjustmentRow | null }> = ({ row, ...rest }) => (
  <Modal isOpen={row !== null} onClose={rest.onClose} title="Edit quantity" size="md">
    {row && <Form key={row.id} row={row} {...rest} />}
  </Modal>
)

const Form: React.FC<FormProps> = ({ row, saving, error, onSave, onClose }) => {
  const [raw, setRaw] = useState(String(row.onHand))
  const quantity = Number(raw)
  const valid = raw.trim() !== '' && Number.isInteger(quantity) && quantity >= row.minimum
  const delta = valid ? quantity - row.onHand : 0

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="font-medium text-text-primary">{row.description}</div>
        <div className="font-mono text-sm text-text-muted">{row.sku}</div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-md border border-border bg-secondary-50 p-3 text-sm">
        {BUCKET_ROWS.map(({ bucket, label }) => (
          <React.Fragment key={bucket}>
            <dt className="text-text-muted">{label}</dt>
            <dd className="text-right font-medium">{n(row.balances[bucket])}</dd>
          </React.Fragment>
        ))}
        <dt className="border-t border-border pt-1 font-semibold">On hand</dt>
        <dd className="border-t border-border pt-1 text-right font-semibold">{n(row.onHand)}</dd>
      </dl>

      <Input
        label="New quantity"
        type="number"
        min={row.minimum}
        step={1}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        error={raw !== '' && !valid ? `Enter a whole number of at least ${n(row.minimum)}` : undefined}
        helperText={
          row.minimum > 0
            ? `${n(row.minimum)} units are on FBA shipments that haven't shipped yet, so they can't be removed here.`
            : 'Increases arrive as unallocated stock. Decreases come out of unallocated first, then FBM, FBA and buffer.'
        }
      />

      {valid && delta !== 0 && (
        <p className="text-sm text-text-muted">
          {delta > 0
            ? `Adds ${n(delta)} unallocated unit${delta === 1 ? '' : 's'}.`
            : `Removes ${n(-delta)} unit${delta === -1 ? '' : 's'}.`}
        </p>
      )}
      {error && <p className="text-sm text-danger-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={() => onSave(row, quantity)} disabled={!valid || delta === 0 || saving}>
          {saving ? 'Saving…' : 'Save quantity'}
        </Button>
      </div>
    </div>
  )
}
