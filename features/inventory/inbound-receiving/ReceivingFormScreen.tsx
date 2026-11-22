'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { Container } from '@/components/layout'
import { SignaturePad } from '@/components/signature-pad/SignaturePad'
import { Button } from '@/design-system/buttons'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableStatusRow } from '@/design-system/tables'
import { ContainerStatusBadge } from '@/features/procurement/shared/poMeta'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useConfirmReceivingMutation, useGetReceivingQuery, type ReceivingDetail } from '@/services/api/inboundReceiving.api'
import { applyServerIssues } from '@/utils/apiErrors'
import { cn } from '@/utils/cn'
import { formatCalendarDay } from '@/utils/format'
import { columnHeading } from './columnHeading'
import { actualOf, defaultsFor, receivingSchema, toUnits, type ReceivingFormValues } from './receivingForm'
import { ReceivingPdfModal } from './ReceivingPdfModal'
import { RECEIVING_ROUTES } from './routes'

const qty = (value: number) => value.toLocaleString('en-CA')
const CELL = 'text-center align-middle'
const cellInput = (error?: string) => cn('ds-input w-24 rounded-lg px-2 py-1 text-center tabular-nums', error ? 'ds-input-error' : 'ds-input-default')

const Fact: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</dt>
    <dd className="mt-0.5 break-words font-mono text-sm font-semibold text-text-primary">{children || '—'}</dd>
  </div>
)

/**
 * The receiving sheet of one container (S#, SKU, expected, good, damaged, shortage, actual received), counted in units
 * because scanning counts units, with a mandatory signature. Expected units come from the packaging list; actual received is
 * good + damaged, worked out here. After scanning the figures start from the scan and can be changed before signing. Confirming asks first, then records the receipt and receives the container.
 */
export const ReceivingFormScreen: React.FC<{ containerId: number }> = ({ containerId }) => {
  const router = useRouter()
  const { data, isLoading, isError } = useGetReceivingQuery(containerId)

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 px-1">
        <Button type="button" size="sm" variant="outline" onClick={() => router.push(RECEIVING_ROUTES.list)}>
          Back
        </Button>
        <h1 className="mt-3 text-xl font-bold text-text-primary sm:text-2xl">Receive container</h1>
      </div>
      {isLoading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : isError || !data ? (
        <div className="rounded-lg border border-border bg-surface p-6 text-sm text-danger-600">
          This container is not in Inbound Receiving.{' '}
          <button type="button" className="underline" onClick={() => router.push(RECEIVING_ROUTES.list)}>
            Back to the list
          </button>
        </div>
      ) : (
        <ReceivingForm detail={data} />
      )}
    </Container>
  )
}

const ReceivingForm: React.FC<{ detail: ReceivingDetail }> = ({ detail }) => {
  const router = useRouter()
  const canWrite = useAppAbility().can('write', 'inventory:inbound-receiving')
  const { success, failure } = useApiFeedback()
  const [confirmReceiving, { isLoading: saving }] = useConfirmReceivingMutation()
  const received = detail.status === 'GOODS_RECEIVED'
  const readOnly = received || !canWrite
  const [confirming, setConfirming] = useState(false)
  const [printing, setPrinting] = useState(false)

  const form = useForm<ReceivingFormValues>({ resolver: zodResolver(receivingSchema), defaultValues: defaultsFor(detail.lines, detail.scanned.started), mode: 'onChange' })
  const { control, register, handleSubmit, setError, reset, formState } = form
  const { fields } = useFieldArray({ control, name: 'lines' })
  const lines = useWatch({ control, name: 'lines' })

  // A confirmed receipt shows what was recorded
  useEffect(() => {
    if (!detail.receipt) return
    reset({
      lines: detail.lines.map((line) => ({
        lineId: line.lineId,
        expected: line.expectedUnits,
        good: String(line.goodUnits ?? 0),
        damaged: String(line.damagedUnits ?? 0),
        shortage: String(line.shortageUnits ?? 0),
      })),
      signature: detail.receipt.signature,
    })
  }, [detail, reset])

  const totals = (lines ?? []).reduce(
    (sum, line) => ({
      expected: sum.expected + line.expected,
      good: sum.good + toUnits(line.good),
      damaged: sum.damaged + toUnits(line.damaged),
      shortage: sum.shortage + toUnits(line.shortage),
    }),
    { expected: 0, good: 0, damaged: 0, shortage: 0 }
  )

  const confirm = handleSubmit(
    async (values) => {
      try {
        await confirmReceiving({
          id: detail.id,
          body: {
            lines: values.lines.map((line) => ({ lineId: line.lineId, goodUnits: toUnits(line.good), damagedUnits: toUnits(line.damaged), shortageUnits: toUnits(line.shortage) })),
            signature: values.signature,
          },
        }).unwrap()
        success(`${detail.containerNumber ?? detail.containerNo} received`)
        router.push(RECEIVING_ROUTES.list)
      } catch (error) {
        setConfirming(false)
        // "lines.3.shortageUnits" from the server lands on that row's shortage cell
        const placed = applyServerIssues(error, setError, (field) => /^lines\.\d+\./.test(field))
        if (!placed) failure(error, 'Could not confirm the receipt')
      }
    },
    () => setConfirming(false)
  )

  return (
    <form onSubmit={(event) => event.preventDefault()} noValidate className="space-y-4">
      <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <dl className="grid gap-4 sm:grid-cols-3">
          <Fact label="Container #">{detail.containerNumber ?? detail.containerNo}</Fact>
          <Fact label="PO #">{detail.poNos.join(', ')}</Fact>
          <Fact label="PL #">{detail.plNos.join(', ')}</Fact>
        </dl>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-text-muted">
          <ContainerStatusBadge status={detail.status} />
          {detail.receipt && (
            <span>
              Received by {detail.receipt.receivedBy} on {formatCalendarDay(detail.receipt.receivedAt)}
            </span>
          )}
          {detail.scanned.started && !received && (
            <span>
              Scanned so far: {qty(detail.scanned.goodUnits)} good, {qty(detail.scanned.damagedUnits)} damaged, {qty(detail.scanned.shortUnits)} short of {qty(detail.scanned.expectedUnits)} units
              {detail.scanned.overUnits > 0 ? `, ${qty(detail.scanned.overUnits)} over` : ''} · scanning {detail.scanned.closed ? 'closed' : 'still open'}. The figures below start from the scan; change any of them before signing.
            </span>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border shadow-sm">
        <div className="overflow-auto">
          <Table className="min-w-full" wrapperClassName="overflow-visible">
            <TableHeader className="bg-surface">
              <TableRow>
                {['S#', 'SKU', 'Expected (units)', 'Good condition (units)', 'Damaged (units)', 'Shortage (units)', 'Actual received (units)'].map((title) => (
                  <TableHead key={title} className="whitespace-nowrap text-center">
                    {columnHeading(title)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.length === 0 ? (
                <TableStatusRow colSpan={7}>This container has no packed products.</TableStatusRow>
              ) : (
                fields.map((field, index) => {
                  const line = detail.lines[index]
                  const errors = formState.errors.lines?.[index]
                  const live = lines?.[index]
                  return (
                    <TableRow key={field.id}>
                      <TableCell className={CELL}>{index + 1}</TableCell>
                      <TableCell className={CELL}>
                        <div className="font-semibold text-text-primary">{line.sku}</div>
                        <div className="text-xs text-text-muted">{line.name}</div>
                      </TableCell>
                      <TableCell className={cn(CELL, 'tabular-nums')}>
                        <div>{qty(line.expectedUnits)}</div>
                        <div className="text-xs text-text-muted">
                          {qty(line.expectedCartons)} ctn × {qty(line.unitsPerCarton)}
                        </div>
                      </TableCell>
                      {(['good', 'damaged', 'shortage'] as const).map((key) => {
                        // The row's "must add up" message sits on its last cell
                        const error = errors?.[key]?.message
                        return (
                          <TableCell key={key} className={CELL}>
                            <input
                              {...register(`lines.${index}.${key}`, { onChange: () => void form.trigger(`lines.${index}.shortage`) })}
                              inputMode="numeric"
                              aria-label={`${line.sku} ${key}`}
                              readOnly={readOnly}
                              className={cellInput(error)}
                            />
                            {error && key === 'shortage' && <p className="mx-auto mt-1 max-w-[12rem] text-xs text-danger-600">{error}</p>}
                          </TableCell>
                        )
                      })}
                      <TableCell className={cn(CELL, 'font-semibold tabular-nums')}>{live ? qty(actualOf(live)) : '—'}</TableCell>
                    </TableRow>
                  )
                })
              )}
              {fields.length > 0 && (
                <TableRow className="bg-secondary-50 font-semibold">
                  <TableCell className={CELL} colSpan={2}>
                    Total
                  </TableCell>
                  <TableCell className={cn(CELL, 'tabular-nums')}>{qty(totals.expected)}</TableCell>
                  <TableCell className={cn(CELL, 'tabular-nums')}>{qty(totals.good)}</TableCell>
                  <TableCell className={cn(CELL, 'tabular-nums')}>{qty(totals.damaged)}</TableCell>
                  <TableCell className={cn(CELL, 'tabular-nums', totals.shortage > 0 && 'text-danger-600')}>{qty(totals.shortage)}</TableCell>
                  <TableCell className={cn(CELL, 'tabular-nums')}>{qty(totals.good + totals.damaged)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-text-primary">Signature{readOnly ? '' : ' *'}</h2>
        {received ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={detail.receipt?.signature} alt="Receiver's signature" className="h-28 rounded-lg border border-border bg-surface object-contain p-2" />
        ) : (
          <Controller control={control} name="signature" render={({ field, fieldState }) => <SignaturePad value={field.value} onChange={field.onChange} error={fieldState.error?.message} disabled={readOnly} className="max-w-xl" />} />
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push(RECEIVING_ROUTES.list)}>
          {received ? 'Back' : 'Cancel'}
        </Button>
        <Button type="button" variant="outline" onClick={() => setPrinting(true)}>
          Download PDF
        </Button>
        {!readOnly && (
          <Button
            type="button"
            onClick={() => void form.trigger().then((valid) => valid && setConfirming(true))}
            disabled={saving}
          >
            Confirm receipt
          </Button>
        )}
      </div>

      <ConfirmDialog isOpen={confirming} title="Confirm receipt" confirmLabel="Confirm" busy={saving} onClose={() => setConfirming(false)} onConfirm={() => void confirm()}>
        <p>
          Record <strong>{qty(totals.good)}</strong> good, <strong>{qty(totals.damaged)}</strong> damaged and <strong>{qty(totals.shortage)}</strong> short units for {detail.containerNumber ?? detail.containerNo}?
        </p>
        <p className="mt-2">
          The container becomes <strong>Goods Received</strong>, its shortage is shown on the container, and {qty(totals.damaged)} damaged units are added to Warehouse Inventory. This cannot be undone.
        </p>
      </ConfirmDialog>

      <ReceivingPdfModal container={printing ? { id: detail.id, containerNo: detail.containerNo } : null} savedSignature={detail.receipt?.signature} onClose={() => setPrinting(false)} />
    </form>
  )
}
