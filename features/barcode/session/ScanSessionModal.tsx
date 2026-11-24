'use client'

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { Badge } from '@/design-system/badges'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { Modal } from '@/design-system/modals'
import { useApiFeedback, apiErrorMessage } from '@/hooks/useApiFeedback'
import {
  useAddSessionScanMutation,
  useDismissUnmatchedUpcMutation,
  useDiscardScanSessionMutation,
  useEndScanSessionMutation,
  useGetScanSessionQuery,
  usePauseScanSessionMutation,
  useRecheckUnmatchedScansMutation,
  useScanSessionHeartbeatMutation,
  useAssignUnmatchedUpcMutation,
  useSearchScanProductsQuery,
  useSetScanLineCountMutation,
  useUndoSessionScanMutation,
  type ReturnCondition,
  type ScanSession,
} from '@/services/api/barcode.api'
import { ScanFieldSource } from '../scanner/ScanFieldSource'
import { LiveChip } from './StatusChip'
import { DIRECTION_META, channelName, conditionName, conditionsFor, isReceipt, sessionCode } from './scanSession'

/** The server's lock lapses after 90 s; this keeps it alive for as long as the modal is open. */
const HEARTBEAT_MS = 30_000
const SCAN_POLL_MS = 1_000
const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

interface Props {
  sessionId: number
  /** Called when the modal goes away; `ended` is true when the session was ended or discarded (inventory may have changed). */
  onClose: (ended: boolean) => void
}

/**
 * The scanning modal for shipments, orders and inbound receiving. The expected lines are already known; every scanned
 * UPC is listed under them as Matched or Not matched, and can be corrected while the session is open (remove a scan, lower
 * a product's count, drop or re-check unmatched UPCs). Nothing touches inventory until the session is ended. Finishing goes
 * in two steps, each asking first: review the counts (and say how many were damaged), then choose to end the session with
 * scanning left open for another round, or to end it and close scanning for good.
 */
export function ScanSessionModal({ sessionId, onClose }: Props) {
  const feedback = useApiFeedback()
  // While scanning, the session is read once a second: each read matches the scans queued since the last one in one batch
  const [scanning, setScanning] = useState(true)
  const { data: session, isLoading, isError } = useGetScanSessionQuery(sessionId, { pollingInterval: scanning ? SCAN_POLL_MS : 0 })
  const [addScan] = useAddSessionScanMutation()
  const [endSession, { isLoading: ending }] = useEndScanSessionMutation()
  const [discard, { isLoading: discarding }] = useDiscardScanSessionMutation()
  const [heartbeat] = useScanSessionHeartbeatMutation()
  const [pause, { isLoading: pausing }] = usePauseScanSessionMutation()
  const [undoScan] = useUndoSessionScanMutation()
  const [setLineCount] = useSetScanLineCountMutation()
  const [assignUnmatched] = useAssignUnmatchedUpcMutation()
  const [dismissUnmatched] = useDismissUnmatchedUpcMutation()
  const [recheck, { isLoading: rechecking }] = useRecheckUnmatchedScansMutation()

  // Finishing: first the review (counts and damaged units), then the choice of how to end
  const [confirming, setConfirming] = useState(false)
  const [choosing, setChoosing] = useState(false)
  // Inventory-in: per product, how many units were damaged / a normal return (asked once, when ending); the rest are sellable
  const [split, setSplit] = useState<ConditionCounts>({})
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  // Scans sent but not yet matched: each shows as a skeleton row until the session read that matches it arrives
  const [waiting, setWaiting] = useState<Array<{ key: number; upc: string }>>([])
  const waitingKey = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const open = session?.status === 'IN_PROGRESS' && session.mine
  useEffect(() => setScanning(open !== false), [open])

  // Every read matches what was queued before it (matched, refused or resolved against an unmatched UPC), so once nothing is pending the skeletons go
  useEffect(() => {
    if (session && session.pending === 0) setWaiting([])
  }, [session])

  // Scans refused for being past the quantity are reported once, whichever read picked them up
  useEffect(() => {
    for (const r of session?.refused ?? []) feedback.error(`All ${r.expected} of ${r.sku} are already scanned`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.refused])
  const isReturn = session?.direction === 'IN'

  const onScan = useCallback(
    async (upc: string) => {
      try {
        await addScan({ id: sessionId, upc }).unwrap()
        setLastSaved(new Date())
        setWaiting((w) => [...w, { key: ++waitingKey.current, upc }])
      } catch (e) {
        feedback.failure(e, 'Could not save the scan')
      }
    },
    [addScan, feedback, sessionId]
  )

  // Corrections while the session is open; the session read that follows each one refreshes the counts
  const run = async (action: () => Promise<unknown>, fallback: string) => {
    try {
      await action()
    } catch (e) {
      feedback.failure(e, fallback)
    }
  }
  const removeScan = (scanId: number) => run(() => undoScan({ id: sessionId, scanId }).unwrap(), 'Could not remove the scan')
  // A product's units are typed in once (a master carton scanned a single time); more scans still add one each
  const saveCount = (inventoryItemId: number, count: number) => run(() => setLineCount({ id: sessionId, inventoryItemId, count }).unwrap(), 'Could not change the count')
  const assignUpc = (upc: string, sku: string) =>
    run(async () => {
      await assignUnmatched({ id: sessionId, upc, sku }).unwrap()
      feedback.success(`${upc} saved on ${sku}`)
    }, 'Could not save the UPC')
  const dropUnmatched = (upc: string) => run(() => dismissUnmatched({ id: sessionId, upc }).unwrap(), 'Could not remove the UPC')
  const recheckUnmatched = () =>
    run(async () => {
      const before = session?.notMatched ?? 0
      const next = await recheck(sessionId).unwrap()
      const fixed = before - next.notMatched
      if (fixed > 0) feedback.success(`${fixed} UPC${fixed === 1 ? ' now matches' : 's now match'}`)
      else feedback.error('Nothing new matched. Fix the product UPC, or scan the item again')
    }, 'Could not re-check the UPCs')

  // Handheld scanners type into the field; it keeps focus so every scan lands in it
  useEffect(() => {
    const input = inputRef.current
    if (!input || !open || confirming) return
    // preventScroll: the plain autofocus attribute scrolls the modal's frame down to this field on a small screen
    input.focus({ preventScroll: true })
    const scanner = new ScanFieldSource(input)
    scanner.start((scan) => void onScan(scan.barcode))
    return () => scanner.stop()
  }, [open, confirming, onScan])

  useEffect(() => {
    if (!open) return
    const timer = setInterval(() => void heartbeat(sessionId), HEARTBEAT_MS)
    return () => clearInterval(timer)
  }, [open, heartbeat, sessionId])

  /** Shipments and orders: leaves the session open for later. Its scans are kept and inventory is untouched. */
  const pauseSession = async () => {
    try {
      await pause(sessionId).unwrap()
      feedback.success('Scans saved. Inventory is updated when scanning is closed')
      setConfirming(false)
      setChoosing(false)
      onClose(false)
    } catch (e) {
      setChoosing(false)
      feedback.error(apiErrorMessage(e, 'Could not save the session'))
    }
  }

  /** Ends the session and closes the record's scanning, applying inventory; receiving can end without closing. */
  const finish = async (closeScanning: boolean) => {
    if (!session) return
    try {
      if (session.scanned === 0) {
        await discard(sessionId).unwrap()
        feedback.success('Session closed. Nothing was scanned, so inventory is unchanged')
      } else {
        const countOnly = session.appliesOn === 'RECEIPT'
        await endSession({ id: sessionId, confirmed: true, closeScanning, ...(!countOnly && session.lines.some((l) => l.scanned > 0) ? { conditions: split } : {}) }).unwrap()
        const updated = countOnly ? 'Scan counts saved for the receipt. Inventory is updated when the receipt is signed' : isReturn ? (isReceipt(session.scenario) ? 'Received units added to inventory' : 'Returned units added to inventory') : 'Inventory updated'
        feedback.success(closeScanning ? `${updated}. Scanning is closed for this record` : `${updated}. You can scan this record again later`)
      }
      setConfirming(false)
      setChoosing(false)
      onClose(true)
    } catch (e) {
      setConfirming(false)
      setChoosing(false)
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
        className="max-w-[1120px] max-h-[90dvh]"
        header={
          <div className="flex w-full flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-border px-6 py-5">
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

            <div className="overflow-x-auto rounded-lg border border-border">
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
                    <Fragment key={line.inventoryItemId}>
                      <tr className={`border-t border-border ${line.state === 'OVER' ? 'bg-warning-50' : ''}`}>
                        <td className="px-3 py-2.5 text-center align-middle">
                          <div className="font-mono text-xs text-text-primary">{line.sku}</div>
                          {line.channelSku && <div className="text-xs text-text-muted">{line.channelSku}</div>}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-center align-middle">{line.upc ?? <Badge variant="warning" size="sm">No UPC</Badge>}</td>
                        <td className="px-3 py-2.5 text-center align-middle">{line.expected}</td>
                        <td className={`px-3 py-2.5 text-center align-middle font-semibold ${line.state === 'MATCHED' ? 'text-success-700' : line.state === 'OVER' ? 'text-warning-700' : ''}`}>
                          {open ? <UnitsInput sku={line.sku} value={line.scanned} onCommit={(count) => saveCount(line.inventoryItemId, count)} /> : line.scanned}
                        </td>
                        <td className="px-3 py-2.5 text-center align-middle">
                          <div className="mx-auto h-1.5 w-24 overflow-hidden rounded-full bg-secondary-200">
                            <div className={`h-full rounded-full ${line.state === 'OVER' ? 'bg-warning-600' : 'bg-primary-600'}`} style={{ width: `${Math.min(100, line.expected ? (line.scanned / line.expected) * 100 : 0)}%` }} />
                          </div>
                          {line.state === 'OVER' && <span className="text-xs font-semibold text-warning-700">+{line.scanned - line.expected} over</span>}
                        </td>
                      </tr>
                    </Fragment>
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

            <div className="overflow-x-auto rounded-lg border border-border">
              <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5 text-sm font-bold">
                <span>
                  Not matched UPCs <span className="font-normal text-text-muted">· one row per UPC</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs font-medium text-text-muted">{session.notMatched} not matched</span>
                  {open && session.notMatched > 0 && (
                    <Button size="sm" variant="outline" onClick={() => void recheckUnmatched()} disabled={rechecking} title="After fixing a product's UPC, match these scans again. Scanning the item again also resolves it">
                      {rechecking ? 'Checking…' : 'Re-check'}
                    </Button>
                  )}
                </span>
              </div>
              {session.unmatched.length === 0 && waiting.length === 0 ? (
                <p className="p-4 text-sm text-text-muted">{session.scanned === 0 ? 'Nothing scanned yet. Scan a UPC to start.' : 'Every scanned UPC matched. Type a SKU’s units above when a carton holds more than you scan.'}</p>
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
                    {session.unmatched.map((entry) => (
                      <tr key={entry.upc} className="border-t border-border bg-warning-50 first:border-0">
                        <td className="w-24 px-3 py-2 font-mono text-xs text-center align-middle">{time(entry.lastScannedAt)}</td>
                        <td className="px-3 py-2 font-mono text-xs text-center align-middle">{entry.upc}</td>
                        <td className="px-3 py-2 text-center align-middle">
                          <Badge variant="warning" size="sm">
                            Not matched{entry.count > 1 ? ` × ${entry.count}` : ''}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-text-secondary text-center align-middle">
                          {entry.reason === 'NOT_ON_RECORD' ? `Not on this ${receipt ? 'receiving' : 'record'}${entry.sku ? ` (${entry.sku})` : ''}` : 'UPC not in catalog'}
                        </td>
                        {open && (
                          <td className="px-3 py-2 text-center align-middle">
                            <ProductPicker sessionId={sessionId} onPick={(sku) => void assignUpc(entry.upc, sku)} />
                          </td>
                        )}
                        {open && (
                          <td className="px-3 py-2 text-center align-middle">
                            <button type="button" onClick={() => void dropUnmatched(entry.upc)} className="text-xs font-semibold text-danger-600 hover:underline" title="Remove these scans from the session">
                              Remove
                            </button>
                          </td>
                        )}
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
                  <p className="mb-3 text-xs text-text-muted">
                    {session.appliesOn === 'RECEIPT'
                      ? 'Scan with the handheld scanner. The counts are kept for the receipt, where the received and damaged units are confirmed and signed.'
                      : `Scan with the handheld scanner. When you finish you will say how many units were damaged; ${isReturn ? 'the rest are added as sellable' : 'the rest go out'}.`}
                  </p>
                  {/* Invisible on purpose: it only has to hold focus so the scanner's keystrokes land in it, with no cursor to confuse anyone */}
                  <input
                    ref={inputRef}
                    aria-label="Scanner input"
                    inputMode="none"
                    autoComplete="off"
                    tabIndex={-1}
                    // Keeps focus for the scanner, unless the user moved to another field (units, product search)
                    onBlur={(event) => {
                      const next = event.relatedTarget
                      if (next instanceof HTMLInputElement || next instanceof HTMLTextAreaElement || next instanceof HTMLSelectElement) return
                      setTimeout(() => !confirming && !(document.activeElement instanceof HTMLInputElement) && inputRef.current?.focus({ preventScroll: true }), 0)
                    }}
                    className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
                  />
                  <div className="flex items-center gap-2 text-sm font-semibold text-success-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-success-600" />
                    Scanner connected
                  </div>
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
              Scans are saved as you go. <b className="text-text-primary">Inventory changes only when {session.appliesOn === 'RECEIPT' ? 'the receipt is signed in Inbound Receiving' : session.appliesOn === 'CLOSE' ? 'you close scanning' : 'you end the session'}</b>: {matchedUnits} unit{matchedUnits === 1 ? '' : 's'} {session.appliesOn === 'RECEIPT' ? 'counted' : isReturn ? 'in' : 'out'} for the matched SKUs. Not matched UPCs are kept on the session.
            </div>
          </div>
        </div>

        <div className="-mx-6 -mb-6 mt-5 flex items-center justify-between border-t border-border bg-secondary-50 px-6 py-4">
          <span className="text-xs text-text-muted">
            {lastSaved ? `Last saved ${time(lastSaved.toISOString())} · ` : ''}started {new Date(session.startedAt).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })} by {session.startedBy.name}
          </span>
          {open ? (
            <div className="flex items-center gap-2">
              <Button onClick={() => setConfirming(true)}>Finish scanning</Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => onClose(false)}>
              Close
            </Button>
          )}
        </div>
      </Modal>

      <EndConfirm
        session={session}
        open={confirming}
        busy={ending || discarding}
        matchedUnits={matchedUnits}
        split={split}
        onSplit={setSplit}
        receipt={receipt}
        onKeep={() => setConfirming(false)}
        // Nothing scanned: there is nothing to choose, the session is simply discarded
        onConfirm={() => (session.scanned === 0 ? void finish(false) : (setConfirming(false), setChoosing(true)))}
      />
      <EndChoice session={session} open={choosing} busy={ending || discarding || pausing} onBack={() => (setChoosing(false), setConfirming(true))} onEnd={(closeScanning) => void finish(closeScanning)} onPause={() => void pauseSession()} />
    </>
  )
}

/** The last question: inventory is updated either way; the record is left open for another round, or closed for good. */
function EndChoice({ session, open, busy, onBack, onEnd, onPause }: { session: ScanSession; open: boolean; busy: boolean; onBack: () => void; onEnd: (closeScanning: boolean) => void; onPause: () => void }) {
  const missing = session.lines.reduce((sum, l) => sum + Math.max(0, l.expected - l.scanned), 0)
  const noun = session.scenario === 'FBM_ORDER' ? 'order' : session.scenario === 'CONTAINER' ? 'receiving' : 'shipment'
  const settles = session.scenario === 'FBA_WFS' && session.direction === 'OUT'
  // Shipments and orders move stock once, when scanning is closed; receiving moves it as each session ends
  const onClose = session.appliesOn === 'CLOSE'
  const countOnly = session.appliesOn === 'RECEIPT'
  const verb = session.direction === 'IN' ? 'updated with' : 'reduced by'
  return (
    <Modal isOpen={open} onClose={onBack} title={onClose ? 'Save for later or close scanning?' : 'How do you want to end this session?'} size="md">
      <p className="-mt-2 mb-3 text-sm text-text-muted">
        {session.ref} · {channelName(session.channel)}
      </p>
      <p className="mb-4 text-sm text-text-secondary">
        {countOnly ? 'Inventory does not change here: the scanned counts are kept for the receipt, and inventory is updated when the receipt is signed.' : onClose ? `Inventory is ${verb} what you scanned only when scanning is closed.` : `Inventory is ${verb} what you scanned either way.`}
        {missing > 0 ? ` ${missing} expected unit${missing === 1 ? ' is' : 's are'} still not scanned.` : ''}
      </p>
      <div className="space-y-3">
        <button type="button" disabled={busy} onClick={() => (onClose ? onPause() : onEnd(false))} className="block w-full rounded-lg border border-border p-4 text-left hover:bg-secondary-50 disabled:opacity-50">
          <span className="block text-sm font-semibold text-text-primary">{onClose ? 'Save and continue later' : 'End session, keep scanning open'}</span>
          <span className="block text-xs text-text-muted">
            {onClose ? `Your scans are kept and inventory does not change. Anyone can pick this ${noun} up again and keep scanning.` : `This ${noun} can be scanned again later for the units still missing.`}
          </span>
        </button>
        <button type="button" disabled={busy} onClick={() => onEnd(true)} className="block w-full rounded-lg border border-border p-4 text-left hover:bg-secondary-50 disabled:opacity-50">
          <span className="block text-sm font-semibold text-text-primary">{onClose ? 'Close scanning and update inventory' : 'End session and close scanning'}</span>
          <span className="block text-xs text-text-muted">
            No more scans can happen on this {noun}, even with units missing.{onClose ? ' Inventory is updated now.' : ''}
            {settles ? ' The shipment becomes Scanned and Shipped.' : ''}
          </span>
        </button>
      </div>
      <div className="mt-5 flex justify-end">
        <Button variant="outline" onClick={onBack} disabled={busy}>
          Back
        </Button>
      </div>
    </Modal>
  )
}

/** Per inventory item id: units that were damaged or a normal return. */
type ConditionCounts = Record<number, Partial<Record<ReturnCondition, number>>>
type Line = ScanSession['lines'][number]

function EndConfirm({ session, open, busy, matchedUnits, split, onSplit, receipt, onKeep, onConfirm }: { session: ScanSession; open: boolean; busy: boolean; matchedUnits: number; split: ConditionCounts; onSplit: (next: ConditionCounts) => void; receipt: boolean; onKeep: () => void; onConfirm: () => void }) {
  const isIn = session.direction === 'IN'
  const unscanned = session.lines.reduce((sum, l) => sum + Math.max(0, l.expected - l.scanned), 0)
  const unscannedSkus = session.lines.filter((l) => l.scanned === 0).length
  const nothing = session.scanned === 0
  const countOnly = session.appliesOn === 'RECEIPT'
  const matchedSkus = session.lines.filter((l) => l.scanned > 0)
  // Units that go into inventory per product: receiving counts every scan, the rest stop at what the record holds
  const counted = (l: Line) => (receipt && isIn ? l.scanned : Math.min(l.scanned, l.expected))
  const otherConditions = conditionsFor(session.scenario, session.direction).filter((c) => c !== 'SELLABLE')
  const otherOf = (l: Line) => otherConditions.reduce((sum, c) => sum + (split[l.inventoryItemId]?.[c] ?? 0), 0)
  const invalid = matchedSkus.some((l) => otherOf(l) > counted(l))
  const setCount = (l: Line, condition: ReturnCondition, raw: string) => {
    const value = Math.max(0, Math.floor(Number(raw.replace(/[^0-9]/g, '')) || 0))
    onSplit({ ...split, [l.inventoryItemId]: { ...split[l.inventoryItemId], [condition]: value } })
  }
  const otherLabel = (c: ReturnCondition) => conditionName(session.scenario, c, c === 'DAMAGED' ? 'Damaged' : 'Normal return')

  return (
    <Modal isOpen={open} onClose={onKeep} title={countOnly ? 'Review the count' : 'Review the count and damaged units'} size="md">
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
                {countOnly
                  ? `${matchedUnits} unit${matchedUnits === 1 ? '' : 's'} counted for this receiving`
                  : `${matchedUnits} unit${matchedUnits === 1 ? '' : 's'} will be ${isIn ? 'added to' : 'taken out of'} inventory${session.appliesOn === 'CLOSE' ? ' when scanning is closed' : ''}`}
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
                  {unscannedSkus > 0 ? `${unscannedSkus} SKU${unscannedSkus === 1 ? ' has' : 's have'} nothing scanned yet. ` : ''}{countOnly ? 'The receipt starts from what was scanned.' : 'Inventory is only adjusted for what was scanned.'}
                </div>
              </div>
            </li>
          )}
        </ul>
      )}
      {!nothing && !countOnly && (
        <div className="mt-4">
          <div className="mb-2 text-sm font-bold">How many of each were {receipt ? 'good and damaged' : isIn ? 'sellable and damaged' : 'good and damaged'}?</div>
          <div className="overflow-hidden rounded-lg border border-border text-sm">
            <table className="w-full">
              <thead className="bg-secondary-100 text-xs text-secondary-600">
                <tr>
                  <th className="px-3 py-2 text-center font-semibold">SKU</th>
                  <th className="px-3 py-2 text-center font-semibold">Counted</th>
                  <th className="px-3 py-2 text-center font-semibold">{receipt || !isIn ? 'Good' : 'Sellable'}</th>
                  {otherConditions.map((c) => (
                    <th key={c} className="px-3 py-2 text-center font-semibold">
                      {otherLabel(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matchedSkus.map((l) => (
                  <tr key={l.inventoryItemId} className="border-t border-border">
                    <td className="px-3 py-2 text-center align-middle font-mono text-xs">{l.sku}</td>
                    <td className="px-3 py-2 text-center align-middle">{counted(l)}</td>
                    <td className={`px-3 py-2 text-center align-middle font-semibold ${otherOf(l) > counted(l) ? 'text-danger-600' : 'text-success-700'}`}>{counted(l) - otherOf(l)}</td>
                    {otherConditions.map((c) => (
                      <td key={c} className="px-3 py-2 text-center align-middle">
                        <input
                          type="text"
                          inputMode="numeric"
                          aria-label={`${otherLabel(c)} units of ${l.sku}`}
                          value={split[l.inventoryItemId]?.[c] ?? 0}
                          onChange={(event) => setCount(l, c, event.target.value)}
                          className="w-16 rounded border border-border bg-surface px-2 py-1 text-center text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!isIn && <p className="mt-2 text-xs text-text-muted">Damaged units are not sent out: they stay in your inventory as damaged.</p>}
          {invalid && <p className="mt-2 text-xs text-danger-600">A product has more damaged or returned units than were counted.</p>}
        </div>
      )}
      <p className="mt-3 rounded-md border border-border bg-secondary-50 p-2.5 text-xs text-secondary-600">{countOnly ? 'Inventory does not change from scanning. The damaged units are entered when the receipt is confirmed and signed in Inbound Receiving. ' : 'Nothing changes yet. '}Next you choose whether to keep scanning open or close it. The same review shows if you close the window with the ×.</p>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="outline" onClick={onKeep} disabled={busy}>
          Keep scanning
        </Button>
        <Button onClick={onConfirm} disabled={busy || invalid}>
          {busy ? 'Saving…' : nothing ? 'Close session' : 'Continue'}
        </Button>
      </div>
    </Modal>
  )
}

/** The units of one product: editable, saved when the field is left or Enter is pressed. A carton scanned once is typed in as its full count. */
function UnitsInput({ sku, value, onCommit }: { sku: string; value: number; onCommit: (count: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = () => {
    if (draft === null) return
    const count = Math.max(0, Math.floor(Number(draft.replace(/[^0-9]/g, '')) || 0))
    setDraft(null)
    if (count !== value) onCommit(count)
  }
  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={`Units of ${sku}`}
      value={draft ?? value}
      onFocus={(event) => event.target.select()}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
      className="w-20 rounded border border-border bg-surface px-2 py-1 text-center text-sm font-semibold outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
    />
  )
}

/** Search the products (this record's first) and pick the one a scanned UPC belongs to; the UPC is saved on it and the scan matches. */
function ProductPicker({ sessionId, onPick }: { sessionId: number; onPick: (sku: string) => void }) {
  const [text, setText] = useState('')
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(false)
  const field = useRef<HTMLInputElement>(null)
  // The list floats over the table (its card clips anything that overflows), placed under the field
  const box = shown ? field.current?.getBoundingClientRect() : undefined
  useEffect(() => {
    const timer = setTimeout(() => setQ(text), 250)
    return () => clearTimeout(timer)
  }, [text])
  const { data = [] } = useSearchScanProductsQuery({ id: sessionId, q }, { skip: !shown })
  return (
    <div className="relative mx-auto w-52">
      <input
        ref={field}
        value={text}
        placeholder="Search product to set UPC"
        aria-label="Search a product to set this UPC on"
        onFocus={() => setShown(true)}
        onBlur={() => setTimeout(() => setShown(false), 150)}
        onChange={(event) => setText(event.target.value)}
        className="h-8 w-full rounded border border-border bg-surface px-2 text-xs outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
      />
      {shown && box && (
        <ul style={{ position: 'fixed', top: box.bottom + 4, left: box.left, width: Math.max(box.width, 240) }} className="z-[1000] max-h-48 overflow-auto rounded-lg border border-border bg-surface text-left text-xs shadow-lg">
          {data.length === 0 && <li className="px-3 py-2 text-text-muted">No products found</li>}
          {data.map((p) => (
            <li key={p.sku}>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => (onPick(p.sku), setShown(false), setText(''))} className="block w-full px-3 py-2 text-left hover:bg-secondary-50">
                <span className="font-mono font-semibold">{p.sku}</span>
                {p.onRecord && <span className="ml-1 text-success-700">· on this record</span>}
                <span className="block truncate text-text-muted">{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
