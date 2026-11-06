'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
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
import { actualOf, defaultsFor, receivingSchema, toCartons, type ReceivingFormValues } from './receivingForm'
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
 * The receiving sheet of one container (S#, SKU, expected, units per carton, good, damaged, shortage, actual received)
 * with a mandatory signature. Expected quantity and units per carton come from the packaging list; actual received is
 * good + damaged, worked out here. Confirming asks first, then records the receipt and receives the container.
 */
export const ReceivingFormScreen: React.FC<{ containerId: number }> = ({ containerId }) => {
  const router = useRouter()
  const { data, isLoading, isError } = useGetReceivingQuery(containerId)

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 px-1">
        <Link href={RECEIVING_ROUTES.list} className="text-sm text-primary-600 underline-offset-2 hover:underline">
          ← Inbound Receiving
        </Link>
        <h1 className="mt-1 text-xl font-bold text-text-primary sm:text-2xl">Receive container</h1>
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

  const form = useForm<ReceivingFormValues>({ resolver: zodResolver(receivingSchema), defaultValues: defaultsFor(detail.lines), mode: 'onChange' })
  const { control, register, handleSubmit, setError, reset, formState } = form
  const { fields } = useFieldArray({ control, name: 'lines' })
  const lines = useWatch({ control, name: 'lines' })

  // A confirmed receipt shows what was recorded
  useEffect(() => {
    if (!detail.receipt) return
    reset({
      lines: detail.lines.map((line) => ({
        lineId: line.lineId,
        expected: line.expectedCartons,
        good: String(line.goodCartons ?? 0),
        damaged: String(line.damagedCartons ?? 0),
        shortage: String(line.shortageCartons ?? 0),
      })),
      signature: detail.receipt.signature,
    })
  }, [detail, reset])

  const totals = (lines ?? []).reduce(
    (sum, line) => ({
      expected: sum.expected + line.expected,
      good: sum.good + toCartons(line.good),
      damaged: sum.damaged + toCartons(line.damaged),
      shortage: sum.shortage + toCartons(line.shortage),
    }),
    { expected: 0, good: 0, damaged: 0, shortage: 0 }
  )
  const damagedUnits = (lines ?? []).reduce((sum, line, index) => sum + toCartons(line.damaged) * (detail.lines[index]?.unitsPerCarton ?? 0), 0)

  const confirm = handleSubmit(
    async (values) => {
      try {
        await confirmReceiving({
          id: detail.id,
          body: {
            lines: values.lines.map((line) => ({ lineId: line.lineId, goodCartons: toCartons(line.good), damagedCartons: toCartons(line.damaged), shortageCartons: toCartons(line.shortage) })),
            signature: values.signature,
          },
        }).unwrap()
        success(`${detail.containerNumber ?? detail.containerNo} received`)
        router.push(RECEIVING_ROUTES.list)
      } catch (error) {
        setConfirming(false)
        // "lines.3.shortageCartons" from the server lands on that row's shortage cell
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
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border shadow-sm">
        <div className="overflow-auto">
          <Table className="min-w-full" wrapperClassName="overflow-visible">
            <TableHeader className="bg-surface">
              <TableRow>
                {['S#', 'SKU', 'Expected Qty (Ctn)', 'Units per Ctn', 'Good Condition (Sellable)', 'Damaged', 'Shortage', 'Actual Received'].map((title) => (
                  <TableHead key={title} className="whitespace-nowrap text-center">
                    {title}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.length === 0 ? (
                <TableStatusRow colSpan={8}>This container has no packed products.</TableStatusRow>
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
                      <TableCell className={cn(CELL, 'tabular-nums')}>{qty(line.expectedCartons)}</TableCell>
                      <TableCell className={cn(CELL, 'tabular-nums')}>{qty(line.unitsPerCarton)}</TableCell>
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
                  <TableCell className={CELL} />
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
          Record <strong>{qty(totals.good)}</strong> good, <strong>{qty(totals.damaged)}</strong> damaged and <strong>{qty(totals.shortage)}</strong> short cartons for {detail.containerNumber ?? detail.containerNo}?
        </p>
        <p className="mt-2">
          The container becomes <strong>Goods Received</strong>, its shortage is shown on the container, and {qty(damagedUnits)} damaged units are added to Warehouse Inventory. This cannot be undone.
        </p>
      </ConfirmDialog>

      <ReceivingPdfModal container={printing ? { id: detail.id, containerNo: detail.containerNo } : null} savedSignature={detail.receipt?.signature} onClose={() => setPrinting(false)} />
    </form>
  )
}
