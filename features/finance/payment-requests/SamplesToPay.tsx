'use client'

import React, { useEffect, useRef } from 'react'
import { useGetPayableSamplesQuery, type PayableSample } from '@/services/api/finance.api'
import { formatCurrencyAmount, formatMoney } from '../shared/format'

interface SamplesToPayProps {
  /** The PO whose samples are offered. */
  purchaseOrderId: number | null
  currency: string
  /** The draft being edited: its own samples stay offered (and ticked). */
  excludeId?: number
  /** Ticked sample ids. */
  value: number[]
  /** Called with the ticked ids and what they add up to. */
  onChange: (ids: number[], total: number) => void
  error?: string
  disabled?: boolean
}

const totalOf = (samples: PayableSample[], ids: number[]): number => Math.round(samples.filter((sample) => ids.includes(sample.id)).reduce((sum, sample) => sum + sample.amount, 0) * 100) / 100

/** The chargeable samples of the picked PO, ticked for this request. A newly picked PO starts with all of them ticked. */
export const SamplesToPay: React.FC<SamplesToPayProps> = ({ purchaseOrderId, currency, excludeId, value, onChange, error, disabled }) => {
  const { data: samples = [], isFetching } = useGetPayableSamplesQuery({ purchaseOrderId: purchaseOrderId ?? 0, excludeId }, { skip: !purchaseOrderId })

  // Once the PO's samples are known: keep what is ticked that is still on offer, or tick them all for a fresh pick
  const startedFor = useRef<number | null>(null)
  useEffect(() => {
    if (!purchaseOrderId || isFetching || startedFor.current === purchaseOrderId) return
    startedFor.current = purchaseOrderId
    const stillOffered = value.filter((id) => samples.some((sample) => sample.id === id))
    const ids = stillOffered.length ? stillOffered : samples.map((sample) => sample.id)
    onChange(ids, totalOf(samples, ids))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseOrderId, isFetching, samples])

  if (!purchaseOrderId) return null

  const toggle = (id: number) => {
    const ids = value.includes(id) ? value.filter((existing) => existing !== id) : [...value, id]
    onChange(ids, totalOf(samples, ids))
  }
  const allTicked = samples.length > 0 && value.length === samples.length
  const toggleAll = () => {
    const ids = allTicked ? [] : samples.map((sample) => sample.id)
    onChange(ids, totalOf(samples, ids))
  }

  return (
    <div className="mt-4 rounded-lg border border-border p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-text-primary">
          Samples to pay <span className="font-normal text-text-muted">chargeable samples of this PO not yet requested</span>
        </p>
        <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
          {value.length} of {samples.length} selected · {formatCurrencyAmount(currency, totalOf(samples, value))}
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-secondary-50 text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="w-10 px-3 py-2">
                <input type="checkbox" aria-label="Tick all samples" checked={allTicked} disabled={disabled || samples.length === 0} onChange={toggleAll} />
              </th>
              <th className="px-3 py-2 text-left">SKU</th>
              <th className="px-3 py-2 text-left">Product</th>
              <th className="px-3 py-2 text-right">Units</th>
              <th className="px-3 py-2 text-right">Unit rate</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((sample) => (
              <tr key={sample.id} className="border-t border-border">
                <td className="px-3 py-2 text-center">
                  <input type="checkbox" aria-label={`Pay for ${sample.product.sku ?? sample.product.name}`} checked={value.includes(sample.id)} disabled={disabled} onChange={() => toggle(sample.id)} />
                </td>
                <td className="px-3 py-2 font-mono text-xs">{sample.product.sku ?? '—'}</td>
                <td className="px-3 py-2">{sample.product.name}</td>
                <td className="px-3 py-2 text-right tabular-nums">{sample.units.toLocaleString('en-CA')}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMoney(sample.unitPrice)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMoney(sample.amount)}</td>
              </tr>
            ))}
            {!isFetching && samples.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-text-muted">
                  This PO has no chargeable sample left to pay.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {error && <p className="mt-2 text-sm text-danger-600">{error}</p>}
      <p className="mt-2 text-xs text-text-muted">Free samples need no payment and are not listed. Samples already on a request are hidden.</p>
    </div>
  )
}
