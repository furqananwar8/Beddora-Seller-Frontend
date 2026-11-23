'use client'

import React, { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { SelectionCheckbox } from '@/components/selection-checkbox/SelectionCheckbox'
import { Button } from '@/design-system/buttons'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableStatusRow } from '@/design-system/tables'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useSendBacklogEmailsMutation, type EmailBacklog } from '@/services/api/systemEmail.api'
import { BulkLink, EmailBulkBar } from './EmailBulkBar'
import { useSelection } from './useSelection'

const COLUMNS = ['Event', 'Records', 'Already emailed', 'Not yet', 'Emails to send']
const COLUMN_COUNT = COLUMNS.length + 1
const n = (value: number) => value.toLocaleString('en-CA')

interface BacklogPanelProps {
  backlog: EmailBacklog | undefined
  loading: boolean
  error: boolean
  /** Only records from this day (`YYYY-MM-DD`) on are looked at. */
  from: string
  onFromChange: (from: string) => void
}

/**
 * "Not yet emailed": records that existed before email was switched on (or were imported) and so never produced an email.
 * Pick events, then send: the same email each event sends today, queued like any other.
 */
export const BacklogPanel: React.FC<BacklogPanelProps> = ({ backlog, loading, error, from, onFromChange }) => {
  const { success, failure } = useApiFeedback()
  const [sendBacklog, { isLoading: sending }] = useSendBacklogEmailsMutation()
  const { selected, toggle, setAll, clear } = useSelection<string>()
  const [confirming, setConfirming] = useState(false)

  const events = backlog?.events ?? []
  const chosen = events.filter((event) => selected.has(event.key))
  const records = chosen.reduce((sum, event) => sum + event.notYet, 0)
  const emails = chosen.reduce((sum, event) => sum + event.emailsToSend, 0)
  const allChosen = events.length > 0 && chosen.length === events.length

  const send = async () => {
    try {
      const result = await sendBacklog({ from, events: chosen.map((event) => event.key) }).unwrap()
      setConfirming(false)
      clear()
      success(`${n(result.queued)} email${result.queued === 1 ? '' : 's'} queued${result.skipped ? `, ${n(result.skipped)} skipped (already emailed)` : ''}${result.remaining ? `. ${n(result.remaining)} more are left: send again to queue them` : ''}`)
    } catch (error) {
      setConfirming(false)
      failure(error, 'Could not queue the emails')
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-52">
          <label htmlFor="backlog-from" className="ds-input-label">
            Records from
          </label>
          <input id="backlog-from" type="date" value={from} max={new Date().toISOString().slice(0, 10)} onChange={(event) => event.target.value && onFromChange(event.target.value)} className="ds-input ds-input-default" />
        </div>
        <p className="max-w-xl pb-2 text-xs text-text-muted">Records already in the system before email was switched on, with no email yet for the people who should have one. Nothing is sent until you choose events and confirm.</p>
      </div>

      {chosen.length > 0 && (
        <EmailBulkBar summary={`${chosen.length} selected · ${n(emails)} email${emails === 1 ? '' : 's'}`} note="Email only: no bell notifications are created for existing records">
          <Button type="button" size="sm" variant="outline" className="bg-white" onClick={() => setConfirming(true)} disabled={emails === 0}>
            Send selected
          </Button>
          <BulkLink onClick={clear}>Clear</BulkLink>
        </EmailBulkBar>
      )}

      <div className="overflow-hidden rounded-lg border border-border shadow-sm">
        <div className="overflow-auto">
          <Table className="min-w-full" wrapperClassName="overflow-visible">
            <TableHeader className="bg-surface">
              <TableRow>
                <TableHead className="w-10">
                  <SelectionCheckbox label="Select every event" checked={allChosen} indeterminate={chosen.length > 0 && !allChosen} onChange={() => setAll(events.map((event) => event.key), !allChosen)} />
                </TableHead>
                {COLUMNS.map((title) => (
                  <TableHead key={title} className="whitespace-nowrap">
                    {title}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableStatusRow colSpan={COLUMN_COUNT} loading />
              ) : error ? (
                <TableStatusRow colSpan={COLUMN_COUNT} tone="danger">
                  Could not work out what has not been emailed.
                </TableStatusRow>
              ) : events.length === 0 ? (
                <TableStatusRow colSpan={COLUMN_COUNT}>Nothing to email for these dates.</TableStatusRow>
              ) : (
                events.map((event) => (
                  <TableRow key={event.key}>
                    <TableCell>
                      <SelectionCheckbox label={`Select ${event.label}`} checked={selected.has(event.key)} onChange={() => toggle(event.key)} />
                    </TableCell>
                    <TableCell>{event.label}</TableCell>
                    <TableCell className="tabular-nums">{n(event.records)}</TableCell>
                    <TableCell className="tabular-nums">{n(event.alreadyEmailed)}</TableCell>
                    <TableCell className="tabular-nums font-semibold">{n(event.notYet)}</TableCell>
                    <TableCell className="tabular-nums">{n(event.emailsToSend)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ConfirmDialog isOpen={confirming} title={`Send ${n(emails)} email${emails === 1 ? '' : 's'} for ${n(records)} existing record${records === 1 ? '' : 's'}?`} confirmLabel={`Send ${n(emails)} email${emails === 1 ? '' : 's'}`} busy={sending} onConfirm={send} onClose={() => setConfirming(false)}>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Each person gets the same email the event sends today, built from the record as it is now.</li>
          <li>
            <strong>Email only.</strong> No bell notifications are created for existing records.
          </li>
          <li>People who already have an email for a record are skipped, so sending twice never duplicates.</li>
          <li>They join the queue and go out two at a time. Each shows in the list as it is sent.</li>
        </ul>
        <p className="mt-3 text-text-muted">{chosen.map((event) => `${event.label} (${n(event.emailsToSend)})`).join(', ')}</p>
      </ConfirmDialog>
    </div>
  )
}
