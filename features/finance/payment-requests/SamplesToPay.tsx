'use client'

import React from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { useGetPayableSamplesQuery, type PayableSample } from '@/services/api/finance.api'
import { formatCurrencyAmount, formatMoney } from '../shared/format'

type Supplier = PayableSample['supplier']

interface SampleSelectionProps {
  /** The request's supplier once picked; until then every supplier's samples are offered. */
  partnerId: number | null
  currency: string
  /** The draft being edited: its own samples stay offered (and picked). */
  excludeId?: number
  /** Picked sample ids. */
  value: number[]
  /** Called with the picked ids and what they add up to. */
  onChange: (ids: number[], total: number) => void
  /** Picking a sample while no supplier is chosen brings its supplier and currency to the request. */
  onPickSupplier: (supplier: Supplier, currency: string) => void
  disabled?: boolean
}

const totalOf = (samples: PayableSample[], ids: number[]): number => Math.round(samples.filter((sample) => ids.includes(sample.id)).reduce((sum, sample) => sum + sample.amount, 0) * 100) / 100

/**
 * The paid (chargeable) samples a request can pay: made on the Samples screen and not on a PO, so not paid with one,
 * and not on another request. Shared by the select and the summary under it, so both read the same list.
 */
function useSampleSelection({ partnerId, currency, excludeId, value, onChange, onPickSupplier }: SampleSelectionProps) {
  const { data: samples = [], isFetching } = useGetPayableSamplesQuery({ excludeId })
  const picked = samples.filter((sample) => value.includes(sample.id))
  // What the request is for: the picked supplier, or that of the samples already picked
  const supplierId = partnerId ?? picked[0]?.supplier.id ?? null
  const requestCurrency = picked[0]?.currency ?? (partnerId ? currency : null)

  /** Why a sample cannot join this request, or null. */
  const blockedReason = (sample: PayableSample): string | null => {
    if (supplierId !== null && sample.supplier.id !== supplierId) return 'Another supplier'
    if (requestCurrency && sample.currency !== requestCurrency) return `Priced in ${sample.currency}`
    return null
  }

  const change = (ids: number[]) => {
    const first = samples.find((sample) => ids.includes(sample.id))
    if (partnerId === null && first) onPickSupplier(first.supplier, first.currency)
    onChange(ids, totalOf(samples, ids))
  }

  return { samples, picked, isFetching, blockedReason, change, requestCurrency: requestCurrency ?? currency }
}

const SampleOption: React.FC<{ sample: PayableSample; reason: string | null }> = ({ sample, reason }) => (
  <span className="block min-w-0">
    <span className="flex items-center justify-between gap-2">
      <span className="truncate">
        <span className="font-mono text-xs font-semibold">{sample.product.sku ?? `#${sample.product.id}`}</span> · {sample.product.name}
      </span>
      <span className="shrink-0 text-xs font-medium tabular-nums">{formatCurrencyAmount(sample.currency, sample.amount)}</span>
    </span>
    <span className="block truncate text-xs text-text-muted">
      {sample.supplier.name} · {sample.units.toLocaleString('en-CA')} units × {sample.currency} {formatMoney(sample.unitPrice)}
      {reason ? ` · ${reason}` : ''}
    </span>
  </span>
)

/** The select for the samples being paid: always there, with or without a supplier; ticking several is allowed. */
export const SamplePaySelect: React.FC<SampleSelectionProps & { id?: string; error?: string }> = ({ id, error, ...props }) => {
  const { samples, picked, isFetching, blockedReason, change } = useSampleSelection(props)
  return (
    <SearchableSelect<PayableSample>
      id={id}
      multiple
      value={picked}
      onChange={(next) => change(next.map((sample) => sample.id))}
      options={samples}
      getKey={(sample) => sample.id}
      getLabel={(sample) => `${sample.product.sku ?? ''} ${sample.product.name} ${sample.supplier.name}`}
      renderValue={(selected) => (selected.length ? `${selected.length} ${selected.length === 1 ? 'sample' : 'samples'} selected` : 'Select samples to pay')}
      renderOption={(sample) => <SampleOption sample={sample} reason={blockedReason(sample)} />}
      disabledReason={blockedReason}
      searchable
      loading={isFetching}
      placeholder="Select samples to pay"
      searchPlaceholder="SKU, product or supplier..."
      emptyText="No paid sample is waiting to be paid."
      error={error}
      disabled={props.disabled}
    />
  )
}

/** What the picked samples add up to, one row each, with a way to take one off the request. */
export const SelectedSamples: React.FC<SampleSelectionProps> = (props) => {
  const { picked, change, requestCurrency } = useSampleSelection(props)
  if (picked.length === 0) return <p className="mt-4 text-sm text-text-muted">Pick the samples you are paying in the Sample field. Only paid samples are listed: free ones need no payment.</p>

  return (
    <div className="mt-4 rounded-lg border border-border p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-text-primary">Samples to pay</p>
        <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
          {picked.length} {picked.length === 1 ? 'sample' : 'samples'} · {formatCurrencyAmount(requestCurrency, totalOf(picked, props.value))}
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-secondary-50 text-xs uppercase tracking-wide text-text-muted">
            <tr>
              <th className="px-3 py-2 text-left">SKU</th>
              <th className="px-3 py-2 text-left">Product</th>
              <th className="px-3 py-2 text-left">Supplier</th>
              <th className="px-3 py-2 text-right">Units</th>
              <th className="px-3 py-2 text-right">Unit rate</th>
              <th className="px-3 py-2 text-right">Amount</th>
              {!props.disabled && <th className="w-10" aria-label="Remove" />}
            </tr>
          </thead>
          <tbody>
            {picked.map((sample) => (
              <tr key={sample.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{sample.product.sku ?? '—'}</td>
                <td className="px-3 py-2">{sample.product.name}</td>
                <td className="px-3 py-2">{sample.supplier.name}</td>
                <td className="px-3 py-2 text-right tabular-nums">{sample.units.toLocaleString('en-CA')}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {sample.currency} {formatMoney(sample.unitPrice)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMoney(sample.amount)}</td>
                {!props.disabled && (
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      aria-label={`Remove the sample of ${sample.product.sku ?? sample.product.name}`}
                      onClick={() => change(props.value.filter((id) => id !== sample.id))}
                      className="rounded p-1 text-text-muted hover:bg-danger-50 hover:text-danger-600"
                    >
                      ×
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-text-muted">Samples on a purchase order are paid with that PO, and free samples need no payment.</p>
    </div>
  )
}
