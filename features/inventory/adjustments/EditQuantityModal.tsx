import React, { useState } from 'react'
import { Modal } from '@/design-system/modals/Modal'
import { Button } from '@/design-system/buttons'
import { Input } from '@/design-system/inputs'
import { AdjustmentRow } from '@/services/api/inventoryAdjustments.api'
import { cn } from '@/utils/cn'
import { BUCKET_ROWS } from './buckets'
import { previewAdjustment } from './adjustmentMath'

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
  const after = valid ? previewAdjustment(row.balances, quantity) : row.balances

  // Red for units removed, green for units added
  const tone = delta < 0 ? 'text-danger-600' : 'text-emerald-700'

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="font-medium text-text-primary">{row.description}</div>
        <div className="font-mono text-sm text-text-muted">{row.sku}</div>
      </div>

      <table className="w-full table-fixed rounded-md border border-border bg-secondary-50 text-sm">
        <thead>
          <tr className="text-text-muted">
            <th className="px-3 py-2 text-left font-medium" />
            <th className="px-3 py-2 text-right font-medium">Current</th>
            <th className="px-3 py-2 text-right font-medium">After</th>
          </tr>
        </thead>
        <tbody>
          {BUCKET_ROWS.map(({ bucket, label }) => {
            const changed = after[bucket] !== row.balances[bucket]
            return (
              <tr key={bucket}>
                <td className="px-3 py-1 text-text-muted">{label}</td>
                <td className="px-3 py-1 text-right font-medium">{n(row.balances[bucket])}</td>
                <td className={cn('px-3 py-1 text-right font-medium', changed && tone)}>{n(after[bucket])}</td>
              </tr>
            )
          })}
          <tr className="border-t border-border font-semibold">
            <td className="px-3 py-2">On hand</td>
            <td className="px-3 py-2 text-right">{n(row.onHand)}</td>
            <td className={cn('px-3 py-2 text-right', delta !== 0 && tone)}>{n(valid ? quantity : row.onHand)}</td>
          </tr>
        </tbody>
      </table>

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
        <p className={cn('text-sm font-medium', tone)}>
          {delta > 0
            ? `Adds ${n(delta)} unit${delta === 1 ? '' : 's'}`
            : `Removes ${n(-delta)} unit${delta === -1 ? '' : 's'}`}
          {` · final on hand ${n(quantity)}`}
        </p>
      )}
      {error && <p className="text-sm text-danger-600">{error}</p>}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
