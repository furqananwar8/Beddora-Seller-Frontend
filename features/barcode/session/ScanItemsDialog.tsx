'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { Modal } from '@/design-system/modals'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { apiErrorMessage } from '@/hooks/useApiFeedback'
import { useCloseScanRecordMutation, useGetScanSourceQuery, useStartScanSessionMutation, type ScanDirection } from '@/services/api/barcode.api'
import { ScanSessionModal } from './ScanSessionModal'
import { DIRECTION_META, inHint, type ScanTarget } from './scanSession'

const schema = z.object({ direction: z.enum(['IN', 'OUT']) })
type FormValues = z.infer<typeof schema>

const DIRECTIONS: ScanDirection[] = ['OUT', 'IN']

interface Props {
  target: ScanTarget
  onClose: () => void
}

/**
 * "Is this inventory In or Out?" The same question for an FBM order and an FBA/WFS shipment: Out takes the units
 * out of stock, In puts returned units back and asks what state they came back in. The record decides which
 * directions are open; a closed one says why.
 */
export function ScanItemsDialog({ target, onClose }: Props) {
  const feedback = useApiFeedback()
  /** Once a session is running the scanning modal replaces this question. */
  const [sessionId, setSessionId] = useState<number | null>(null)
  const { data: info, isLoading, isError, error } = useGetScanSourceQuery(target)
  const [start, { isLoading: starting }] = useStartScanSessionMutation()

  const { register, watch, setValue, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    // A container only comes in
    defaultValues: { direction: target.scenario === 'CONTAINER' ? 'IN' : 'OUT' },
  })
  const directions = target.scenario === 'CONTAINER' ? DIRECTIONS.filter((d) => d === 'IN') : DIRECTIONS
  const direction = watch('direction')
  const [confirmingClose, setConfirmingClose] = useState(false)
  const [closeRecord, { isLoading: closing }] = useCloseScanRecordMutation()

  // Start on the first open direction, so the common case is one click
  const firstOpen = useMemo(() => (info ? directions.find((d) => !info.availability[d]) : undefined), [info, directions])
  useEffect(() => {
    if (firstOpen) setValue('direction', firstOpen)
  }, [firstOpen, setValue])

  const submit = handleSubmit(async ({ direction: dir }) => {
    try {
      const session = await start({ ...target, direction: dir }).unwrap()
      setSessionId(session.id)
    } catch (e) {
      feedback.failure(e, 'Could not start scanning')
    }
  })

  const closeScanning = async () => {
    try {
      await closeRecord({ ...target, direction }).unwrap()
      feedback.success('Scanning closed. This record takes no more scans')
      setConfirmingClose(false)
      onClose()
    } catch (e) {
      setConfirmingClose(false)
      feedback.error(apiErrorMessage(e, 'Could not close scanning'))
    }
  }

  if (sessionId !== null) return <ScanSessionModal sessionId={sessionId} onClose={onClose} />

  return (
    <>
    <Modal isOpen onClose={onClose} title={info ? `Scan items · ${info.ref}` : 'Scan items'} size="md">
      {isLoading && (
        <div className="flex justify-center p-8">
          <Spinner size="sm" />
        </div>
      )}
      {isError && <p className="text-sm text-danger-600">{(error as { data?: { error?: string } })?.data?.error ?? 'Could not open this record for scanning.'}</p>}

      {info && (
        <form onSubmit={submit} className="space-y-4">
          {info.resume && (
            <div className="rounded-lg border border-border bg-surface-secondary p-3 text-sm">
              You have a {DIRECTION_META[info.resume.direction].label.toLowerCase()} scan open on this record.
              <Button type="button" variant="outline" size="sm" className="ml-3" onClick={() => setSessionId(info.resume!.id)}>
                Resume scanning
              </Button>
            </div>
          )}

          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium text-text-primary">{target.scenario === 'CONTAINER' ? 'Inventory direction' : 'Is this inventory in or out?'}</legend>
            {directions.map((value) => {
              const reason = info.availability[value]
              return (
                <label
                  key={value}
                  className={`flex items-start gap-3 rounded-lg border border-border p-3 ${reason ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-secondary-50'}`}
                >
                  <input type="radio" value={value} disabled={Boolean(reason)} className="mt-1" {...register('direction')} />
                  <span>
                    <span className="block text-sm font-medium text-text-primary">{DIRECTION_META[value].label}</span>
                    <span className="block text-xs text-text-muted">{reason ?? (value === 'IN' ? inHint(target.scenario) : DIRECTION_META[value].hint)}</span>
                  </span>
                </label>
              )
            })}
          </fieldset>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" className="mr-auto" disabled={!firstOpen || Boolean(info.availability[direction])} onClick={() => setConfirmingClose(true)} title="Stop scanning this record for good, even with units still missing">
              Close scanning
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!firstOpen || Boolean(info.availability[direction]) || starting}>
              {starting ? 'Starting…' : 'Start scanning'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
    <Modal isOpen={confirmingClose} onClose={() => setConfirmingClose(false)} title="Close scanning for good?" size="md">
      <p className="text-sm text-text-secondary">
        {info?.ref} will <b>not accept scanning again</b>, even if some units were never scanned. Anything already scanned stays counted. To stop for now and come back later, just leave it open.
      </p>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="outline" onClick={() => setConfirmingClose(false)} disabled={closing}>
          Keep it open
        </Button>
        <Button onClick={() => void closeScanning()} disabled={closing}>
          {closing ? 'Closing…' : 'Close scanning'}
        </Button>
      </div>
    </Modal>
    </>
  )
}
