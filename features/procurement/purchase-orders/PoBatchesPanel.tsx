'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { NamesPreview } from '../shared/NamesPreview'
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

/** The batch's SKUs: the first few inline, the rest behind "Show more" so the row stays tidy. */
const SkuCell: React.FC<{ batch: PoBatch }> = ({ batch }) => <NamesPreview items={batch.lines.map((line) => ({ label: `${line.product.ref} × ${units(line.units)}` }))} title={`${batch.label} · SKUs`} max={2} itemClassName="font-mono whitespace-nowrap" />

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

interface NewBatchValues {
  date: string
  lines: Array<{ productId: number; units: string }>
}

/** A new batch of an approved PO: units of SKUs no batch holds (what a short packaging list left behind). No approval needed. */
const AddBatchModal: React.FC<{ po: PurchaseOrderDetail; isOpen: boolean; onClose: () => void }> = ({ po, isOpen, onClose }) => {
  const [addBatch, { isLoading }] = useAddPurchaseOrderBatchMutation()
  const { success, failure } = useApiFeedback()
  const schema = useMemo(
    () =>
      z.object({
        date: z.string(),
        lines: z
          .array(
            z.object({
              productId: z.number(),
              units: z.string().trim(),
            })
          )
          .superRefine((lines, ctx) => {
            lines.forEach((line, index) => {
              const left = po.unbatched[index]?.units ?? 0
              if (line.units !== '' && (!/^\d+$/.test(line.units) || Number(line.units) < 1 || Number(line.units) > left)) ctx.addIssue({ code: 'custom', path: [index, 'units'], message: `Only ${units(left)} left` })
            })
            if (lines.every((line) => line.units === '')) ctx.addIssue({ code: 'custom', message: 'Enter the units of at least one SKU' })
          }),
      }),
    [po.unbatched]
  )
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewBatchValues>({ resolver: zodResolver(schema), defaultValues: { date: '', lines: [] } })

  // Start empty each time it opens: one row per SKU still left to batch
  useEffect(() => {
    if (isOpen) reset({ date: '', lines: po.unbatched.map((item) => ({ productId: item.product.id, units: '' })) })
  }, [isOpen, po.unbatched, reset])

  const submit = handleSubmit(async (values) => {
    try {
      const saved = await addBatch({
        id: po.id,
        body: { ...(values.date && { productionDate: values.date }), lines: values.lines.filter((line) => line.units !== '').map((line) => ({ productId: line.productId, units: Number(line.units) })) },
      }).unwrap()
      success(`${saved.poNo} batch ${saved.batches.length} added`)
      onClose()
    } catch (error) {
      failure(error, 'Could not add the batch')
    }
  })

  return (
    <Modal isOpen={isOpen} onClose={isLoading ? () => undefined : onClose} title={`Add batch · ${po.poNo}`} size="md">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
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
            {po.unbatched.map((item, index) => (
              <tr key={item.product.id} className="border-t border-border">
                <td className={`${CELL} font-mono text-xs`}>{item.product.ref}</td>
                <td className={`${CELL} tabular-nums`}>{units(item.units)}</td>
                <td className={CELL}>
                  <Controller
                    control={control}
                    name={`lines.${index}.units`}
                    render={({ field }) => (
                      <NumericInput aria-label={`Units of ${item.product.ref} in the new batch`} className="ds-input mx-auto h-9 w-28 py-1 text-right tabular-nums" value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value)} onBlur={field.onBlur} />
                    )}
                  />
                  {errors.lines?.[index]?.units?.message && <p className="mt-1 text-xs text-danger-600">{errors.lines[index]?.units?.message}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {errors.lines?.root?.message && <p className="text-xs text-danger-600">{errors.lines.root.message}</p>}
        <div className="flex items-center gap-3">
          <label className="text-sm text-text-secondary" htmlFor="new-batch-production">
            Production date (optional)
          </label>
          <Controller control={control} name="date" render={({ field }) => <SingleDatePicker id="new-batch-production" value={field.value} onChange={field.onChange} placeholder="Select Date" className="w-44" />} />
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Save batch
          </Button>
        </div>
      </form>
    </Modal>
  )
}

interface PoBatchesPanelProps {
  purchaseOrderId: number
  /** Offers "Add batch" (the PO detail and the list's expanded row). */
  withAdd?: boolean
  /** The PO's production date under the table; the PO detail shows it elsewhere. */
  showProductionDate?: boolean
}

/** The batches of an approved PO: production date, status, units, packing list. */
export const PoBatchesPanel: React.FC<PoBatchesPanelProps> = ({ purchaseOrderId, withAdd, showProductionDate = !withAdd }) => {
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
      {withAdd && po.can.addBatch && allPlsFinal && po.unbatched.length > 0 && (
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
            + Add batch
          </Button>
          <AddBatchModal po={po} isOpen={adding} onClose={() => setAdding(false)} />
        </div>
      )}
      {showProductionDate && po.productionDate && <p className="text-xs text-text-muted">PO production date: {formatCalendarDay(po.productionDate)} (the earliest batch)</p>}
    </div>
  )
}
