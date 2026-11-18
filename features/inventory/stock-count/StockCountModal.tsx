'use client'

import React, { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField } from '@/components/form-field/FormField'
import { Button } from '@/design-system/buttons'
import { Input, Textarea } from '@/design-system/inputs'
import { Modal } from '@/design-system/modals'
import type { StockCountRow } from '@/services/api/stockCount.api'
import { cn } from '@/utils/cn'
import { BUCKET_ROWS } from '../adjustments/buckets'
import { previewAdjustment } from '../adjustments/adjustmentMath'
import { CountFormValues, makeCountSchema, onHandAfter, varianceOf } from './stockCountMath'

const n = (value: number) => value.toLocaleString()
const signed = (value: number) => (value > 0 ? `+${n(value)}` : n(value))

interface StockCountModalProps {
  row: StockCountRow | null
  saving: boolean
  onSave: (row: StockCountRow, values: CountFormValues) => void
  onClose: () => void
}

/**
 * Records the physical count of one SKU for the day on screen. The variance against the system quantity of that day is
 * applied to today's stock, so what shipped or sold since stays deducted: a count of 1,900 for a day the system said 2,000,
 * with 800 shipped since, leaves 1,100 on hand now.
 */
export const StockCountModal: React.FC<StockCountModalProps> = ({ row, saving, onSave, onClose }) => (
  <Modal isOpen={row !== null} onClose={onClose} title="Stock adjustment" size="md">
    {row && <CountForm key={`${row.id}:${row.asOf}`} row={row} saving={saving} onSave={onSave} onClose={onClose} />}
  </Modal>
)

const CountForm: React.FC<{ row: StockCountRow; saving: boolean; onSave: StockCountModalProps['onSave']; onClose: () => void }> = ({ row, saving, onSave, onClose }) => {
  const schema = useMemo(() => makeCountSchema(row), [row])
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CountFormValues>({ resolver: zodResolver(schema), defaultValues: { counted: row.systemOnHand, note: '' } })

  const counted = watch('counted')
  const valid = schema.shape.counted.safeParse(counted).success
  const variance = valid ? varianceOf(row, counted) : 0
  const after = valid ? onHandAfter(row, counted) : row.currentOnHand
  const buckets = valid ? previewAdjustment(row.balances, after) : row.balances
  // Red for units removed, green for units added
  const tone = variance < 0 ? 'text-danger-600' : 'text-emerald-700'

  return (
    <form onSubmit={handleSubmit((values) => onSave(row, values))} noValidate className="flex flex-col gap-4">
      <div>
        <div className="font-medium text-text-primary">{row.description}</div>
        <div className="font-mono text-sm text-text-muted">{row.sku}</div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-border bg-secondary-50 p-3 text-sm">
        <dt className="text-text-muted">System quantity on {row.asOf}</dt>
        <dd className="text-right font-medium">{n(row.systemOnHand)}</dd>
        <dt className="text-text-muted">Shipped or sold since</dt>
        <dd className="text-right font-medium">{row.movedSince.out > 0 ? `−${n(row.movedSince.out)}` : '0'}</dd>
        <dt className="text-text-muted">Received since</dt>
        <dd className="text-right font-medium">{n(row.movedSince.in)}</dd>
        <dt className="font-semibold">On hand now</dt>
        <dd className="text-right font-semibold">{n(row.currentOnHand)}</dd>
      </dl>

      <FormField label={`Physical count on ${row.asOf}`} htmlFor="stock-count-counted" required error={errors.counted?.message}>
        <Input id="stock-count-counted" type="number" step={1} autoFocus {...register('counted', { valueAsNumber: true })} />
      </FormField>

      {valid && (
        <div className="rounded-md border border-border text-sm">
          <div className="flex justify-between px-3 py-2">
            <span className="text-text-muted">Variance</span>
            <span className={cn('font-semibold', variance !== 0 && tone)}>{signed(variance)}</span>
          </div>
          <div className="flex justify-between gap-4 border-t border-border px-3 py-2">
            <span className="text-text-muted">
              On hand now after the count ({n(counted)}
              {row.movedSince.in > 0 ? ` + ${n(row.movedSince.in)} received` : ''}
              {row.movedSince.out > 0 ? ` − ${n(row.movedSince.out)} shipped or sold` : ''})
            </span>
            <span className={cn('font-semibold', variance !== 0 && tone)}>{n(after)}</span>
          </div>
          {variance !== 0 && (
            <div className="border-t border-border bg-secondary-50 px-3 py-2">
              {BUCKET_ROWS.filter(({ bucket }) => buckets[bucket] !== row.balances[bucket]).map(({ bucket, label }) => (
                <div key={bucket} className="flex justify-between py-0.5 text-text-muted">
                  <span>{label}</span>
                  <span className={cn('font-medium', tone)}>
                    {n(row.balances[bucket])} → {n(buckets[bucket])}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <FormField label="Reason" htmlFor="stock-count-note" error={errors.note?.message}>
        <Textarea id="stock-count-note" rows={2} placeholder="Optional, e.g. damaged in storage, miscounted on receipt" {...register('note')} />
      </FormField>

      <p className="text-xs text-text-muted">Saving corrects the quantity for {row.asOf} and every day after it. Reports for earlier days don&apos;t change.</p>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={!valid || variance === 0 || saving}>
          {saving ? 'Saving…' : 'Save adjustment'}
        </Button>
      </div>
    </form>
  )
}
