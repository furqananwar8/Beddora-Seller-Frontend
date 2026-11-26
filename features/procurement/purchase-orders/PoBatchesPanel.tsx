'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { NumericInput } from '@/components/form-field/NumericInput'
import { StatusBadge, type StatusTone } from '@/components/status-badge/StatusBadge'
import { SingleDatePicker } from '@/components/single-date-picker/SingleDatePicker'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { Spinner } from '@/design-system/loaders'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import {
  useAddPurchaseOrderBatchMutation,
  useGetProcurementPurchaseOrderQuery,
  useSetPurchaseOrderBatchProductionDateMutation,
  type PoBatch,
  type PoBatchStatus,
  type PurchaseOrderDetail,
} from '@/services/api/procurement.api'
import { formatCalendarDay } from '@/utils/format'
import { PoDateCell, toDay } from './PoDateCell'

const BATCH_STATUS: Record<PoBatchStatus, { label: string; tone: StatusTone }> = {
  DRAFT: { label: 'DRAFT', tone: 'neutral' },
  PENDING_APPROVAL: { label: 'PENDING APPROVAL', tone: 'warning' },
  IN_PRODUCTION: { label: 'IN PRODUCTION', tone: 'info' },
  PACKED: { label: 'PACKED', tone: 'warning' },
  SHIPPED: { label: 'SHIPPED', tone: 'info' },
  RECEIVED: { label: 'RECEIVED', tone: 'success' },
}

export const BatchStatusBadge: React.FC<{ status: PoBatchStatus }> = ({ status }) => <StatusBadge label={BATCH_STATUS[status].label} tone={BATCH_STATUS[status].tone} />

const HEAD = 'px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-text-muted'
const CELL = 'px-3 py-2 text-center align-middle'
const units = (value: number) => value.toLocaleString('en-CA')

const SKU_PREVIEW = 2

/** The batch's SKUs: the first few inline, the rest behind "Show more" (a modal listing just the SKUs) so the row stays tidy. */
const SkuCell: React.FC<{ batch: PoBatch }> = ({ batch }) => {
  const [open, setOpen] = useState(false)
  const extra = batch.lines.length - SKU_PREVIEW
  return (
    <>
      <div className="flex flex-col gap-0.5">
        {batch.lines.slice(0, SKU_PREVIEW).map((line) => (
          <span key={line.id} className="whitespace-nowrap">
            <span className="font-mono">{line.product.ref}</span> × {units(line.units)}
          </span>
        ))}
        {extra > 0 && (
          <button type="button" className="w-fit font-medium text-primary-600 hover:underline" onClick={() => setOpen(true)}>
            Show {extra} more
          </button>
        )}
      </div>
      <Modal isOpen={open} onClose={() => setOpen(false)} title={`${batch.label} · SKUs (${batch.lines.length})`} size="sm" closeOnBackdropClick closeOnEscape>
        <ul className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto font-mono text-sm">
          {batch.lines.map((line) => (
            <li key={line.id}>
              {line.product.ref} × {units(line.units)}
            </li>
          ))}
        </ul>
      </Modal>
    </>
  )
}

const BatchRow: React.FC<{ po: PurchaseOrderDetail; batch: PoBatch }> = ({ po, batch }) => {
  const [setDate] = useSetPurchaseOrderBatchProductionDateMutation()
  return (
    <tr className="border-t border-border" data-testid={`batch-row-${batch.seq}`}>
      <td className={`${CELL} font-semibold`}>{batch.label}</td>
      <td className={CELL}>
        <PoDateCell
          id={`po-${po.id}-batch-${batch.id}-production`}
          poNo={`${po.poNo} ${batch.label}`}
          label="production date"
          value={batch.productionDate}
          editable={po.can.setProductionDate}
          lockedReason="Available once the PO is approved"
          max={po.ard ? toDay(po.ard) : undefined}
          clearable={false}
          onSave={(value) => setDate({ id: po.id, batchId: batch.id, productionDate: value }).unwrap()}
        />
      </td>
      <td className={CELL}>
        <BatchStatusBadge status={batch.status} />
      </td>
      <td className={`${CELL} text-left text-xs`}>
        <SkuCell batch={batch} />
      </td>
      <td className={`${CELL} tabular-nums`}>{units(batch.units)}</td>
      <td className={`${CELL} tabular-nums`}>{units(batch.packed)}</td>
      <td className={CELL}>
        {batch.packagingList ? (
          <Link href={`/dashboard/procurement/packaging-lists/${batch.packagingList.id}`} className="font-medium text-primary-600 underline-offset-2 hover:underline">
            {batch.packagingList.plNo}
          </Link>
        ) : (
          '—'
        )}
        {batch.packagingList && <span className="block text-xs text-text-muted">{batch.packagingList.kind === 'TENTATIVE' ? 'Tentative' : 'Final'}</span>}
      </td>
    </tr>
  )
}

/** A new batch of an approved PO: units of SKUs no batch holds (what a short packaging list left behind). No approval needed. */
const AddBatchForm: React.FC<{ po: PurchaseOrderDetail; onDone: () => void }> = ({ po, onDone }) => {
  const [addBatch, { isLoading }] = useAddPurchaseOrderBatchMutation()
  const { success, failure } = useApiFeedback()
  const [typed, setTyped] = useState<Record<number, string>>({})
  const [date, setDate] = useState('')
  const lines = po.unbatched.map((item) => ({ ...item, value: typed[item.product.id] ?? '' })).filter((item) => item.value !== '')
  const invalid = lines.some((item) => !/^\d+$/.test(item.value) || Number(item.value) < 1 || Number(item.value) > item.units)

  const submit = async () => {
    try {
      const saved = await addBatch({ id: po.id, body: { ...(date && { productionDate: date }), lines: lines.map((item) => ({ productId: item.product.id, units: Number(item.value) })) } }).unwrap()
      success(`${saved.poNo} batch ${saved.batches.length} added`)
      onDone()
    } catch (error) {
      failure(error, 'Could not add the batch')
    }
  }

  if (po.unbatched.length === 0) {
    return <p className="rounded-lg border border-border bg-secondary-50 px-3 py-2 text-sm text-text-secondary">Every unit is in a batch. When a packaging list takes fewer units than its batch, the units left can go in a new batch.</p>
  }
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3" data-testid="add-batch-form">
      <p className="text-sm text-text-secondary">Units not in any batch (for example what a short packaging list left behind). A batch cannot take more than this.</p>
      <table className="text-sm">
        <thead>
          <tr>
            <th className={HEAD}>SKU</th>
            <th className={HEAD}>Left to batch</th>
            <th className={HEAD}>Units in the new batch</th>
          </tr>
        </thead>
        <tbody>
          {po.unbatched.map((item) => (
            <tr key={item.product.id} className="border-t border-border">
              <td className={`${CELL} font-mono text-xs`}>{item.product.ref}</td>
              <td className={`${CELL} tabular-nums`}>{units(item.units)}</td>
              <td className={CELL}>
                <NumericInput
                  aria-label={`Units of ${item.product.ref} in the new batch`}
                  className="ds-input mx-auto h-9 w-28 py-1 text-right tabular-nums"
                  value={typed[item.product.id] ?? ''}
                  onChange={(event) => setTyped((current) => ({ ...current, [item.product.id]: event.target.value }))}
                />
                {typed[item.product.id] && Number(typed[item.product.id]) > item.units && <p className="mt-1 text-xs text-danger-600">Only {units(item.units)} left</p>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-text-secondary" htmlFor="new-batch-production">
          Production date (optional)
        </label>
        <SingleDatePicker id="new-batch-production" value={date} onChange={setDate} placeholder="Select Date" className="min-w-[9.5rem]" />
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="outline" onClick={onDone} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void submit()} isLoading={isLoading} disabled={lines.length === 0 || invalid}>
            Save batch
          </Button>
        </div>
      </div>
    </div>
  )
}

interface PoBatchesPanelProps {
  purchaseOrderId: number
  /** Offers "Add batch" (the PO detail); the list's expanded row only shows the batches. */
  withAdd?: boolean
}

/** The batches of an approved PO: production date, status, units, packing list. */
export const PoBatchesPanel: React.FC<PoBatchesPanelProps> = ({ purchaseOrderId, withAdd }) => {
  const { data: po, isLoading, isError } = useGetProcurementPurchaseOrderQuery(purchaseOrderId)
  const [adding, setAdding] = useState(false)
  if (isLoading) return <div className="flex justify-center py-4"><Spinner /></div>
  if (isError || !po) return <p className="py-3 text-center text-sm text-danger-600">Could not load the batches.</p>
  // A new batch is only for units a finalized packaging list left behind (a later batch gets its own list and container)
  const allPlsFinal = po.batches.every((batch) => batch.packagingList?.kind === 'FINAL')
  return (
    <div className="flex flex-col gap-3 text-left" data-testid={`batches-${po.id}`}>
      <div className="ds-scroll-x rounded-lg border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-secondary-50">
            <tr>
              <th className={HEAD}>Batch</th>
              <th className={HEAD}>Production date</th>
              <th className={HEAD}>Status</th>
              <th className={HEAD}>SKUs</th>
              <th className={HEAD}>Units</th>
              <th className={HEAD}>Packed</th>
              <th className={HEAD}>Packaging list</th>
            </tr>
          </thead>
          <tbody>
            {po.batches.map((batch) => (
              <BatchRow key={batch.id} po={po} batch={batch} />
            ))}
          </tbody>
        </table>
      </div>
      {withAdd && po.can.addBatch && allPlsFinal && po.unbatched.length > 0 && (adding ? <AddBatchForm po={po} onDone={() => setAdding(false)} /> : (
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
            + Add batch
          </Button>
        </div>
      ))}
      {!withAdd && po.productionDate && <p className="text-xs text-text-muted">PO production date: {formatCalendarDay(po.productionDate)} (the earliest batch)</p>}
    </div>
  )
}
