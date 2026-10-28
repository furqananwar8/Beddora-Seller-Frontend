'use client'

import React, { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { currentMonth, MonthPicker, monthLabel } from '@/components/month-picker/MonthPicker'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { Modal } from '@/design-system/modals'
import { formatCurrencyAmount } from '@/features/finance/shared/format'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useGetSkuLandedOpexQuery, useSetWarehouseOverheadMutation } from '@/services/api/procurement.api'

const Line: React.FC<{ label: string; note?: string; children: React.ReactNode; strong?: boolean }> = ({ label, note, children, strong }) => (
  <div className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
    <div>
      <p className={strong ? 'font-semibold text-text-primary' : 'text-text-primary'}>{label}</p>
      {note && <p className="text-xs text-text-muted">{note}</p>}
    </div>
    <div className={strong ? 'font-semibold tabular-nums text-text-primary' : 'tabular-nums text-text-primary'}>{children}</div>
  </div>
)

/** Warehouse overhead per month (recorded at the default once the month ends), next to that month's 3PL payments: together, opex. */
export const WarehouseOverheadModal: React.FC<{ open: boolean; onClose: () => void; canEdit: boolean }> = ({ open, onClose, canEdit }) => {
  const thisMonth = currentMonth()
  const [month, setMonth] = useState(thisMonth)
  const [confirming, setConfirming] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)
  const { data, isFetching } = useGetSkuLandedOpexQuery(month, { skip: !open })
  const [setOverhead, { isLoading: saving }] = useSetWarehouseOverheadMutation()
  const { success, failure } = useApiFeedback()

  const pick = (next: string) => {
    setMonth(next)
    setDraft(null)
  }
  const save = async () => {
    try {
      await setOverhead({ month, amount: Number(draft) }).unwrap()
      success(`Warehouse overhead for ${monthLabel(month)} saved`)
      setDraft(null)
    } catch (error) {
      failure(error, 'Could not save the overhead')
    }
  }
  const valid = draft !== null && draft.trim() !== '' && Number(draft) >= 0

  return (
    <Modal isOpen={open} onClose={onClose} title="Warehouse overhead" size="md" closeOnEscape={!saving}>
      <div className="flex flex-col gap-4">
        <MonthPicker value={month} onChange={pick} max={thisMonth} />

        {!data ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : (
          <div className={isFetching ? 'opacity-70 transition-opacity' : undefined}>
            <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
              <Line
                label={`Warehouse overhead · ${monthLabel(month)}`}
                note={data.overhead.edited ? 'Edited' : data.overhead.recorded ? 'Recorded at the default' : 'Recorded at this amount when the month ends'}
              >
                {draft === null ? (
                  <div className="flex items-center gap-2">
                    {formatCurrencyAmount(data.currency, data.overhead.amount)}
                    {canEdit && (
                      <Button type="button" size="sm" variant="outline" onClick={() => setConfirming(true)}>
                        Edit
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      autoFocus
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      aria-label="Warehouse overhead amount"
                      className="ds-input ds-input-default w-32 rounded-lg text-right"
                    />
                    <Button type="button" size="sm" variant="outline" onClick={() => setDraft(null)} disabled={saving}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" onClick={() => void save()} isLoading={saving} disabled={!valid}>
                      Save
                    </Button>
                  </div>
                )}
              </Line>
              <Line label="3PL payments" note={`${data.thirdParty.payments} approved payment${data.thirdParty.payments === 1 ? '' : 's'} booked to the mapped 3PL expenses`}>
                {formatCurrencyAmount(data.currency, data.thirdParty.amount)}
              </Line>
              <Line label="Opex" strong>
                {formatCurrencyAmount(data.currency, data.total)}
              </Line>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirming}
        title="Edit warehouse overhead?"
        confirmLabel="Edit"
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false)
          setDraft(String(data?.overhead.amount ?? ''))
        }}
      >
        The overhead for {monthLabel(month)} changes opex for that month. The amount you save is kept until someone edits it again.
      </ConfirmDialog>
    </Modal>
  )
}
