'use client'

import React, { useEffect, useState } from 'react'
import { FormField } from '@/components/form-field/FormField'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Alert } from '@/design-system/alerts'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { apiErrorMessage } from '@/hooks/useApiFeedback'
import { useCancelShipmentMutation } from '@/services/api/shipping.api'
import type { OrderListItem } from '../../types'
import { canBulkVoid } from './bulkSelection'
import { runPool } from './pool'

/** Typing VOID is asked from this many labels up: a slip on a few is recoverable, on many is not. */
const TYPE_TO_CONFIRM_FROM = 5
const VOID_AT_ONCE = 3

type Outcome = { status: 'voided' | 'pending' | 'failed'; detail: string }

interface BulkVoidDialogProps {
  /** The selected orders; null keeps the dialog closed. */
  rows: OrderListItem[] | null
  onClose: () => void
}

/**
 * Cancel / void many labels. Only unscanned labels qualify: the others are listed with why they are left out. Each
 * parcel is voided on its own (the provider decides: voided now, or pending its refund), so one failure never undoes
 * the rest, and failed ones can be retried alone.
 */
export const BulkVoidDialog: React.FC<BulkVoidDialogProps> = ({ rows, onClose }) => {
  const [cancel] = useCancelShipmentMutation()
  const [typed, setTyped] = useState('')
  const [outcomes, setOutcomes] = useState<Record<number, Outcome>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setTyped('')
    setOutcomes({})
  }, [rows])

  const list = rows ?? []
  const voidable = list.filter(canBulkVoid)
  const needsTyping = voidable.length >= TYPE_TO_CONFIRM_FROM
  const ran = Object.keys(outcomes).length > 0
  const failed = voidable.filter((row) => row.booking && outcomes[row.booking.id]?.status === 'failed')

  const run = async (targets: OrderListItem[]) => {
    setBusy(true)
    await runPool(targets, VOID_AT_ONCE, async (row) => {
      if (!row.booking) return
      const id = row.booking.id
      try {
        const result = await cancel(id).unwrap()
        setOutcomes((current) => ({ ...current, [id]: result.status === 'VOID_PENDING' ? { status: 'pending', detail: 'The carrier confirms the refund later' } : { status: 'voided', detail: 'Label voided' } }))
      } catch (error) {
        setOutcomes((current) => ({ ...current, [id]: { status: 'failed', detail: apiErrorMessage(error, 'Could not void') } }))
      }
    })
    setBusy(false)
  }

  return (
    <Modal isOpen={rows !== null} onClose={busy ? () => undefined : onClose} title={`Cancel / void ${voidable.length} label${voidable.length === 1 ? '' : 's'}`} size="lg">
      <div className="space-y-4">
        <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border text-sm">
          {list.map((row) => {
            const id = row.booking?.id
            const outcome = id !== undefined ? outcomes[id] : undefined
            return (
              <li key={`${row.channel}:${row.market}:${row.orderId}`} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="font-medium">{row.orderId}</span>
                <span className="text-text-muted">{row.booking ? `${row.booking.carrier} · ${row.booking.statusLabel}` : 'No label'}</span>
                {outcome ? (
                  <span className="flex items-center gap-2">
                    <StatusBadge label={outcome.status === 'voided' ? 'Voided' : outcome.status === 'pending' ? 'Void pending' : 'Failed'} tone={outcome.status === 'voided' ? 'success' : outcome.status === 'pending' ? 'warning' : 'danger'} />
                    <span className="max-w-[14rem] truncate text-xs text-text-muted" title={outcome.detail}>
                      {outcome.detail}
                    </span>
                  </span>
                ) : canBulkVoid(row) ? (
                  <StatusBadge label="Will be voided" tone="neutral" />
                ) : (
                  <StatusBadge label="Can't void: already scanned or not booked here" tone="neutral" />
                )}
              </li>
            )
          })}
        </ul>
        {!ran && (
          <>
            <Alert variant="warning">Labels are voided with each carrier and the charge refunded to the provider balance. Don&apos;t hand these parcels over. A label the carrier has scanned can&apos;t be voided: those are left out.</Alert>
            <p className="text-sm text-text-secondary">
              <b>{voidable.length}</b> of {list.length} labels can be voided. Each refund is the postage paid, shown in its booking.
            </p>
            {needsTyping && (
              <FormField label="Type VOID to confirm" htmlFor="bulk-void-confirm">
                <input id="bulk-void-confirm" value={typed} onChange={(event) => setTyped(event.target.value)} className="ds-input ds-input-default rounded-lg" placeholder="VOID" autoComplete="off" />
              </FormField>
            )}
          </>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {ran ? 'Done' : 'Keep labels'}
          </Button>
          {ran ? (
            <Button variant="outline" onClick={() => void run(failed)} disabled={busy || failed.length === 0} isLoading={busy}>
              Retry failed ({failed.length})
            </Button>
          ) : (
            <Button variant="danger" onClick={() => void run(voidable)} isLoading={busy} disabled={voidable.length === 0 || (needsTyping && typed.trim().toUpperCase() !== 'VOID')}>
              Cancel / void {voidable.length} label{voidable.length === 1 ? '' : 's'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
