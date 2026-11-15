'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { skipToken } from '@reduxjs/toolkit/query'
import { Badge } from '@/design-system/badges'
import { Button } from '@/design-system/buttons'
import { Select } from '@/design-system/inputs'
import { Spinner } from '@/design-system/loaders'
import { Modal } from '@/design-system/modals'
import { useApiFeedback, apiErrorMessage } from '@/hooks/useApiFeedback'
import {
  useAddSessionScanMutation,
  useDiscardScanSessionMutation,
  useEndScanSessionMutation,
  useGetScanSessionQuery,
  useGetScanSourceQuery,
  useScanSessionHeartbeatMutation,
  type ReturnCondition,
  type ScanSession,
} from '@/services/api/barcode.api'
import { ScanFieldSource } from '../scanner/ScanFieldSource'
import { LiveChip } from './StatusChip'
import { DIRECTION_META, channelName, conditionName, conditionsFor, isReceipt, sessionCode } from './scanSession'

/** The server's lock lapses after 90 s; this keeps it alive for as long as the modal is open. */
const HEARTBEAT_MS = 30_000
const SCAN_POLL_MS = 1_000
const CONDITIONS: ReturnCondition[] = ['SELLABLE', 'NORMAL_RETURN', 'DAMAGED']
const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

interface Props {
  sessionId: number
  /** The condition the first scans of a return or receipt are recorded with. */
  initialCondition?: ReturnCondition
  /** Called when the modal goes away; `ended` is true when the session was ended or discarded (inventory may have changed). */
  onClose: (ended: boolean) => void
}

/**
 * The scanning modal for shipments, orders and inbound receiving. The expected lines are already known; every scanned
 * UPC is listed under them as Matched or Not matched. Nothing touches inventory until the session is ended, and ending
 * (the button or the ×) always asks first.
 */
export function ScanSessionModal({ sessionId, initialCondition = 'SELLABLE', onClose }: Props) {
  const feedback = useApiFeedback()
  // While scanning, the session is read once a second: each read matches the scans queued since the last one in one batch
  const [scanning, setScanning] = useState(true)
  const { data: session, isLoading, isError } = useGetScanSessionQuery(sessionId, { pollingInterval: scanning ? SCAN_POLL_MS : 0 })
  const [addScan] = useAddSessionScanMutation()
  const [endSession, { isLoading: ending }] = useEndScanSessionMutation()
  const [discard, { isLoading: discarding }] = useDiscardScanSessionMutation()
  const [heartbeat] = useScanSessionHeartbeatMutation()

  const [condition, setCondition] = useState<ReturnCondition>(initialCondition)
  const [confirming, setConfirming] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  // Scans sent but not yet matched: each shows as a skeleton row until the session read that matches it arrives
  const [waiting, setWaiting] = useState<Array<{ key: number; upc: string }>>([])
  const waitingKey = useRef(0)
  const seen = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const open = session?.status === 'IN_PROGRESS' && session.mine
  useEffect(() => setScanning(open !== false), [open])

  // A matched scan raises the count and a refused one comes back in `refused`: either way its skeleton goes
  useEffect(() => {
    if (!session) return
    const total = session.scanned + (session.refused?.length ?? 0)
    if (seen.current !== null && total > seen.current) setWaiting((w) => w.slice(total - seen.current!))
    seen.current = total
  }, [session])

  // Scans refused for being past the quantity are reported once, whichever read picked them up
  useEffect(() => {
    for (const r of session?.refused ?? []) feedback.error(`All ${r.expected} of ${r.sku} are already scanned`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.refused])
  const isReturn = session?.direction === 'IN'
  const { data: source } = useGetScanSourceQuery(session ? { scenario: session.scenario, sourceId: session.sourceId } : skipToken)
  const conditionLabel = (value: ReturnCondition) => source?.conditions.find((c) => c.value === value)?.label ?? value

  // The condition is read at scan time, so a change applies to the next scan only
  const conditionRef = useRef(condition)
  conditionRef.current = condition

  const onScan = useCallback(
    async (upc: string) => {
      try {
        await addScan({ id: sessionId, upc, condition: isReturn ? conditionRef.current : undefined }).unwrap()
        setLastSaved(new Date())
        setWaiting((w) => [...w, { key: ++waitingKey.current, upc }])
      } catch (e) {
        feedback.failure(e, 'Could not save the scan')
      }
    },
    [addScan, feedback, isReturn, sessionId]
  )

  // Handheld scanners type into the field; it keeps focus so every scan lands in it
  useEffect(() => {
    const input = inputRef.current
    if (!input || !open || confirming) return
    const scanner = new ScanFieldSource(input)
    scanner.start((scan) => void onScan(scan.barcode))
    return () => scanner.stop()
  }, [open, confirming, onScan])

  useEffect(() => {
    if (!open) return
    const timer = setInterval(() => void heartbeat(sessionId), HEARTBEAT_MS)
    return () => clearInterval(timer)
  }, [open, heartbeat, sessionId])

  const finish = async () => {
    if (!session) return
    try {
      if (session.scanned === 0) {
        await discard(sessionId).unwrap()
        feedback.success('Session closed. Nothing was scanned, so inventory is unchanged')
      } else {
        await endSession({ id: sessionId, confirmed: true }).unwrap()
        feedback.success(isReturn ? (isReceipt(session.scenario) ? 'Received units added to inventory' : 'Returned units added to inventory') : 'Inventory updated')
      }
      setConfirming(false)
      onClose(true)
    } catch (e) {
      setConfirming(false)
      feedback.error(apiErrorMessage(e, 'Could not end the session'))
    }
  }

  if (isLoading) {
    return (
      <Modal isOpen onClose={() => onClose(false)} title="Scan items" size="md">
        <div className="flex justify-center p-8">
          <Spinner size="sm" />
        </div>
      </Modal>
    )
  }
  if (isError || !session) {
    return (
      <Modal isOpen onClose={() => onClose(false)} title="Scan items" size="md">
        <p className="text-sm text-danger-600">This scan session could not be opened.</p>
      </Modal>
    )
  }

  const meta = DIRECTION_META[session.direction]
  const receipt = isReceipt(session.scenario)
  const overLines = session.lines.filter((l) => l.state === 'OVER')
  const stillToScan = session.lines.filter((l) => l.scanned < l.expected).length
  const totalExpected = session.lines.reduce((sum, l) => sum + l.expected, 0)
  const matchedUnits = session.lines.reduce((sum, l) => sum + (receipt && isReturn ? l.scanned : Math.min(l.scanned, l.expected)), 0)
  const requestClose = () => (open ? setConfirming(true) : onClose(false))

  return (
    <>
      <Modal
        isOpen
        onClose={requestClose}
        size="xl"
        className="max-w-[1120px]"
        header={
          <div className="flex w-full items-start justify-between gap-4 border-b border-border px-6 py-5">
            <div>
              <h2 className="text-xl font-bold text-text-primary">Scan items · {session.ref}</h2>
              <p className="mt-1 text-sm text-text-muted">
                {channelName(session.channel)} · {session.lines.length} SKU{session.lines.length === 1 ? '' : 's'}, {totalExpected} unit{totalExpected === 1 ? '' : 's'} expected
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{sessionCode(session.id)}</Badge>
              {session.status === 'IN_PROGRESS' && <LiveChip>● Live</LiveChip>}
              <Badge variant={meta.badge}>{meta.label}</Badge>
            </div>
          </div>
        }
      >
        {session.status === 'IN_PROGRESS' && !session.mine && (
          <div className="mb-4 rounded-lg border border-warning-200 bg-warning-50 p-3 text-sm text-warning-800">Locked by {session.by.name}. You can look, but only they can scan or end the session.</div>
        )}

        <div className="flex flex-col gap-5 lg:flex-row">
          <div className="min-w-0 flex-1 space-y-4">
            {receipt && overLines.length > 0 && (
              <div className="rounded-lg border border-warning-200 bg-warning-50 p-3 text-sm text-warning-800">
                <b>{overLines.map((l) => `${l.scanned - l.expected} more than expected for ${l.sku}`).join('; ')}.</b> Receiving counts what is physically scanned, so all of them go into inventory and the extra are flagged on the session. Check the delivery against the purchase order.
              </div>
            )}

            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary-100 text-xs text-secondary-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-center align-middle">SKU</th>
                    <th className="px-3 py-2 font-semibold text-center align-middle">UPC</th>
                    <th className="px-3 py-2 text-center font-semibold align-middle">Expected</th>
                    <th className="px-3 py-2 text-center font-semibold align-middle">Scanned</th>
                    <th className="px-3 py-2 font-semibold text-center align-middle">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {session.lines.map((line) => (
                    <tr key={line.inventoryItemId} className={`border-t border-border ${line.state === 'OVER' ? 'bg-warning-50' : ''}`}>
                      <td className="px-3 py-2.5 text-center align-middle">
                        <div className="font-mono text-xs text-text-primary">{line.sku}</div>
                        {line.channelSku && <div className="text-xs text-text-muted">{line.channelSku}</div>}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-center align-middle">{line.upc ?? <Badge variant="warning" size="sm">No UPC</Badge>}</td>
                      <td className="px-3 py-2.5 text-center align-middle">{line.expected}</td>
                      <td className={`px-3 py-2.5 text-right font-semibold ${line.state === 'MATCHED' ? 'text-success-700' : line.state === 'OVER' ? 'text-warning-700' : ''}`}>{line.scanned}</td>
                      <td className="px-3 py-2.5 text-center align-middle">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary-200">
                          <div className={`h-full rounded-full ${line.state === 'OVER' ? 'bg-warning-600' : 'bg-primary-600'}`} style={{ width: `${Math.min(100, line.expected ? (line.scanned / line.expected) * 100 : 0)}%` }} />
                        </div>
                        {line.state === 'OVER' && <span className="text-xs font-semibold text-warning-700">+{line.scanned - line.expected} over</span>}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-border bg-secondary-50 font-bold">
                    <td className="px-3 py-2 text-center align-middle">Total</td>
                    <td />
                    <td className="px-3 py-2 text-center align-middle">{totalExpected}</td>
                    <td className="px-3 py-2 text-center align-middle">
                      {matchedUnits} / {totalExpected}
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <div className="flex items-center justify-between border-b border-border px-3 py-2.5 text-sm font-bold">
                <span>
                  Scanned UPCs <span className="font-normal text-text-muted">· latest first</span>
                </span>
                <span className="text-xs font-medium text-text-muted">
                  Showing {session.latest.length} of {session.scanned}
                </span>
              </div>
              {session.latest.length === 0 && waiting.length === 0 ? (
                <p className="p-4 text-sm text-text-muted">Nothing scanned yet. Scan a UPC to start.</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {[...waiting].reverse().map((w) => (
                      <tr key={`w${w.key}`} className="border-t border-border first:border-0" aria-busy="true">
                        <td className="w-24 px-3 py-2 text-center align-middle">
                          <div className="mx-auto h-3 w-14 animate-pulse rounded bg-secondary-200" />
                        </td>
                        <td className="px-3 py-2 text-center align-middle font-mono text-xs">{w.upc}</td>
                        <td className="px-3 py-2 text-center align-middle">
                          <div className="mx-auto h-5 w-20 animate-pulse rounded-full bg-secondary-200" />
                        </td>
                        <td className="px-3 py-2 text-center align-middle">
                          <div className="mx-auto h-3 w-32 animate-pulse rounded bg-secondary-200" />
                        </td>
                      </tr>
                    ))}
                    {session.latest.slice(0, 8).map((scan) => (
                      <tr key={scan.id} className={`border-t border-border first:border-0 ${scan.state === 'COUNTED' ? '' : 'bg-warning-50'}`}>
                        <td className="w-24 px-3 py-2 font-mono text-xs text-center align-middle">{time(scan.scannedAt)}</td>
                        <td className="px-3 py-2 font-mono text-xs text-center align-middle">{scan.upc}</td>
                        <td className="px-3 py-2 text-center align-middle">
                          <Badge variant={scan.state === 'COUNTED' ? 'success' : 'warning'} size="sm">
                            {scan.state === 'COUNTED' ? 'Matched' : 'Not matched'}
                          </Badge>
                          {scan.condition && (
                            <span className="ml-1">
                              <Badge size="sm" variant="secondary">
                                {conditionLabel(scan.condition)}
                              </Badge>
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-text-secondary text-center align-middle">
                          {scan.state === 'COUNTED' ? scan.sku : scan.state === 'NOT_ON_RECORD' ? `Not on this ${receipt ? 'receiving' : 'record'}${scan.sku ? ` (${scan.sku})` : ''}` : 'UPC not in catalog'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="w-full space-y-4 lg:w-72">
            <div className="rounded-lg border-2 border-primary-600 p-4">
              <div className="mb-2 text-xs font-semibold text-secondary-600">Scanner</div>
              {open ? (
                <>
                  {isReturn && (
                    <Select
                      className="mb-3"
                      label="Condition of the next scans"
                      value={condition}
                      onChange={(event) => setCondition(event.target.value as ReturnCondition)}
                      options={conditionsFor(session.scenario).map((value) => ({ value, label: conditionName(session.scenario, value, conditionLabel(value)) }))}
                    />
                  )}
                  <input
                    ref={inputRef}
                    aria-label="Scan an item UPC"
                    inputMode="none"
                    autoComplete="off"
                    autoFocus
                    placeholder="Scan or type a UPC, then Enter"
                    onBlur={() => setTimeout(() => !confirming && inputRef.current?.focus({ preventScroll: true }), 0)}
                    className="h-11 w-full rounded-lg border border-border bg-secondary-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-300"
                  />
                  <div className="mt-2 text-xs font-semibold text-success-700">● Scanner ready</div>
                </>
              ) : (
                <div className="text-sm text-text-muted">{session.status === 'COMPLETED' ? 'Session ended.' : session.status === 'DISCARDED' ? 'Session discarded.' : 'Not your session.'}</div>
              )}
            </div>

            <dl className="rounded-lg border border-border px-4 py-1.5 text-sm">
              {[
                ['UPCs scanned', session.scanned, ''],
                ['Matched', session.matched, 'text-success-700'],
                ['Not matched', session.notMatched, session.notMatched > 0 ? 'text-warning-700' : ''],
                [receipt && isReturn ? 'Over expected' : 'SKUs still to scan', receipt && isReturn ? session.differences.over : stillToScan, receipt && isReturn && session.differences.over > 0 ? 'text-warning-700' : ''],
              ].map(([label, value, tone], index, all) => (
                <div key={String(label)} className={`flex justify-between py-3 ${index < all.length - 1 ? 'border-b border-border' : ''}`}>
                  <dt className="text-text-muted">{label}</dt>
                  <dd className={`text-lg font-bold ${tone}`}>{value}</dd>
                </div>
              ))}
            </dl>

            <div className="rounded-lg border border-border bg-secondary-50 p-4 text-sm leading-relaxed text-secondary-600">
              Scans are saved as you go. <b className="text-text-primary">Inventory changes only when you end the session</b>: {matchedUnits} unit{matchedUnits === 1 ? '' : 's'} {isReturn ? 'in' : 'out'} for the matched SKUs. Not matched UPCs are kept on the session.
            </div>
          </div>
        </div>

        <div className="-mx-6 -mb-6 mt-5 flex items-center justify-between border-t border-border bg-secondary-50 px-6 py-4">
          <span className="text-xs text-text-muted">
            {lastSaved ? `Last saved ${time(lastSaved.toISOString())} · ` : ''}started {new Date(session.startedAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })} by {session.startedBy.name}
          </span>
          {open ? (
            <Button onClick={() => setConfirming(true)}>End session</Button>
          ) : (
            <Button variant="outline" onClick={() => onClose(false)}>
              Close
            </Button>
          )}
        </div>
      </Modal>

      <EndConfirm session={session} open={confirming} busy={ending || discarding} matchedUnits={matchedUnits} onKeep={() => setConfirming(false)} onConfirm={() => void finish()} />
    </>
  )
}

function EndConfirm({ session, open, busy, matchedUnits, onKeep, onConfirm }: { session: ScanSession; open: boolean; busy: boolean; matchedUnits: number; onKeep: () => void; onConfirm: () => void }) {
  const isIn = session.direction === 'IN'
  const unscanned = session.lines.reduce((sum, l) => sum + Math.max(0, l.expected - l.scanned), 0)
  const unscannedSkus = session.lines.filter((l) => l.scanned === 0).length
  const nothing = session.scanned === 0
  const matchedSkus = session.lines.filter((l) => l.scanned > 0)

  return (
    <Modal isOpen={open} onClose={onKeep} title="End this scan session?" size="md">
      <p className="-mt-2 mb-3 text-sm text-text-muted">
        Session {sessionCode(session.id)} · {session.ref} · {channelName(session.channel)}
      </p>
      {nothing ? (
        <p className="text-sm text-text-secondary">Nothing was scanned, so ending closes the session without changing inventory.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          <li className="flex gap-3 py-3">
            <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-success-600" />
            <div>
              <b>
                {matchedUnits} unit{matchedUnits === 1 ? '' : 's'} will be {isIn ? 'added to' : 'taken out of'} inventory
              </b>
              <div className="mt-0.5 text-text-muted">
                Matched across {matchedSkus.length} SKU{matchedSkus.length === 1 ? '' : 's'}: {matchedSkus.map((l) => `${l.sku} ${l.scanned}`).join(', ')}.
              </div>
            </div>
          </li>
          {session.notMatched > 0 && (
            <li className="flex gap-3 py-3">
              <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-warning-600" />
              <div>
                <b>
                  {session.notMatched} scanned UPC{session.notMatched === 1 ? '' : 's'} did not match
                </b>
                <div className="mt-0.5 text-text-muted">They change nothing in inventory. They stay on the session, so you can fix the product UPC and scan them again in a new session.</div>
              </div>
            </li>
          )}
          {unscanned > 0 && (
            <li className="flex gap-3 py-3">
              <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-secondary-400" />
              <div>
                <b>
                  {unscanned} expected unit{unscanned === 1 ? ' was' : 's were'} not scanned
                </b>
                <div className="mt-0.5 text-text-muted">
                  {unscannedSkus > 0 ? `${unscannedSkus} SKU${unscannedSkus === 1 ? ' has' : 's have'} nothing scanned yet. ` : ''}Inventory is only adjusted for what was scanned.
                </div>
              </div>
            </li>
          )}
        </ul>
      )}
      <p className="mt-3 rounded-md border border-border bg-secondary-50 p-2.5 text-xs text-secondary-600">This cannot be undone from the modal. The same confirmation shows if you close the window with the ×.</p>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="outline" onClick={onKeep} disabled={busy}>
          Keep scanning
        </Button>
        <Button onClick={onConfirm} disabled={busy}>
          {busy ? 'Saving…' : nothing ? 'Close session' : 'End session and update inventory'}
        </Button>
      </div>
    </Modal>
  )
}
