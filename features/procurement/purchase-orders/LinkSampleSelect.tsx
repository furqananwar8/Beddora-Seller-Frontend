'use client'

import React from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { SAMPLE_STATUS_META } from '@/features/inventory/samples/sampleMeta'
import { formatCurrencyAmount } from '@/features/finance/shared/format'
import type { SupplierRef } from '@/services/api/procurement.api'
import { useGetLinkableSamplesQuery, type LinkableSample } from '@/services/api/samples.api'

interface LinkSampleSelectProps {
  id?: string
  /** The PO's supplier, once picked; until then a sample brings its own supplier along. */
  supplier: SupplierRef | null
  currency: 'USD' | 'CAD'
  /** The PO being edited; its own samples are not offered again. */
  purchaseOrderId?: number
  /** Ids of the samples already linked on the form. */
  linkedIds: ReadonlySet<number>
  onLink: (samples: LinkableSample[]) => void
  onUnlink: (sampleId: number) => void
}

const SampleOption: React.FC<{ sample: LinkableSample }> = ({ sample }) => (
  <span className="block min-w-0">
    <span className="flex items-center justify-between gap-2">
      <span className="truncate">
        <span className="font-mono text-xs font-semibold">{sample.product.sku ?? `#${sample.product.id}`}</span> · {sample.product.name}
      </span>
      <span className="shrink-0 text-xs text-text-muted">{SAMPLE_STATUS_META[sample.status].label}</span>
    </span>
    <span className="block truncate text-xs text-text-muted">
      {sample.supplier.name} · {sample.units.toLocaleString('en-CA')} units · {sample.isFree ? 'Free' : `${formatCurrencyAmount(sample.currency, sample.unitPrice)} / unit`} ·{' '}
      {sample.purchaseOrder ? `on ${sample.purchaseOrder.poNo}${sample.linkable ? ' (moves here)' : ''}` : 'standalone'}
    </span>
  </span>
)

/**
 * Every unpaid sample (made on a PO or on the Samples screen), ticked to link. Picking one with no supplier chosen yet
 * brings its supplier and currency to the PO; once the PO has them, samples of another supplier or currency stay listed
 * but cannot be ticked. A linked sample keeps its saved details: it can only be removed from the PO.
 */
export const LinkSampleSelect: React.FC<LinkSampleSelectProps> = ({ id, supplier, currency, purchaseOrderId, linkedIds, onLink, onUnlink }) => {
  const { data = [], isFetching } = useGetLinkableSamplesQuery({ purchaseOrderId })
  const selected = data.filter((sample) => linkedIds.has(sample.id))
  // The supplier this PO ends up with: its own, or that of the samples already ticked here
  const target = supplier?.id ?? selected[0]?.supplier.id ?? null
  const targetCurrency = supplier || selected.length ? (selected[0]?.currency ?? currency) : null

  const blockedReason = (sample: LinkableSample): string | false => {
    if (!sample.linkable) return 'On an approved PO'
    if (target !== null && sample.supplier.id !== target) return 'Another supplier'
    if (targetCurrency !== null && sample.currency !== targetCurrency) return `Priced in ${sample.currency}`
    return false
  }

  const change = (next: LinkableSample[]) => {
    const nextIds = new Set(next.map((sample) => sample.id))
    onLink(next.filter((sample) => !linkedIds.has(sample.id)))
    selected.filter((sample) => !nextIds.has(sample.id)).forEach((sample) => onUnlink(sample.id))
  }

  const linkAll = (close: () => void) => {
    const open = data.filter((sample) => !blockedReason(sample))
    // With no supplier yet, "all" is all of the first sample's supplier
    const first = open[0]
    const group = target === null && first ? open.filter((sample) => sample.supplier.id === first.supplier.id && sample.currency === first.currency) : open
    change([...selected, ...group.filter((sample) => !linkedIds.has(sample.id))])
    close()
  }

  return (
    <SearchableSelect<LinkableSample>
      id={id}
      multiple
      value={selected}
      onChange={change}
      options={data}
      getKey={(sample) => sample.id}
      getLabel={(sample) => `${sample.product.sku ?? ''} ${sample.product.name} ${sample.supplier.name} ${sample.purchaseOrder?.poNo ?? ''}`}
      renderValue={(picked) => (picked.length ? `${picked.length} ${picked.length === 1 ? 'sample' : 'samples'} linked` : 'Select samples to link')}
      renderOption={(sample) => <SampleOption sample={sample} />}
      disabledReason={blockedReason}
      searchable
      loading={isFetching}
      placeholder="Select samples to link"
      searchPlaceholder="SKU, product, supplier or PO number..."
      emptyText="No unpaid samples to link."
      footer={(close) => (
        <button type="button" onClick={() => linkAll(close)} disabled={data.every((sample) => blockedReason(sample))} className="block w-full rounded-md px-2 pb-1 pt-2 text-left text-sm font-medium text-primary-600 hover:underline disabled:opacity-50">
          Link all
        </button>
      )}
    />
  )
}
