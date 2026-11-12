'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { skipToken } from '@reduxjs/toolkit/query'
import { Badge } from '@/design-system/badges'
import { Button } from '@/design-system/buttons'
import { Card, CardContent } from '@/design-system/cards'
import { Input, Select } from '@/design-system/inputs'
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
  useUndoSessionScanMutation,
  type ReturnCondition,
  type ScanDifferences,
  type ScanSession,
} from '@/services/api/barcode.api'
import { ScanFieldSource } from '../scanner/ScanFieldSource'
import { DIRECTION_META, LINE_STATE_META, SCAN_STATE_META, conditionName, conditionsFor, isReceipt } from './scanSession'

/** Shorter than the server's lock TTL (60 s) so the lock never lapses while the screen is open. */
const HEARTBEAT_MS = 20_000
const CONDITIONS: ReturnCondition[] = ['SELLABLE', 'NORMAL_RETURN', 'DAMAGED']

const isCondition = (value: string | null): value is ReturnCondition => CONDITIONS.includes(value as ReturnCondition)

export function ScanSessionScreen({ sessionId }: { sessionId: number }) {
  const router = useRouter()
  const feedback = useApiFeedback()
  const initial = useSearchParams().get('condition')
  const { data: session, isLoading, isError } = useGetScanSessionQuery(sessionId)
  const [addScan] = useAddSessionScanMutation()
  const [undoScan] = useUndoSessionScanMutation()
  const [endSession, { isLoading: ending }] = useEndScanSessionMutation()
  const [discard] = useDiscardScanSessionMutation()
  const [heartbeat] = useScanSessionHeartbeatMutation()

  const [condition, setCondition] = useState<ReturnCondition>(isCondition(initial) ? initial : 'SELLABLE')
  const [differences, setDifferences] = useState<ScanDifferences | null>(null)
  const [checked, setChecked] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const open = session?.status === 'IN_PROGRESS' && session.mine
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
      } catch (e) {
        feedback.failure(e, 'Could not save the scan')
      }
    },
    [addScan, feedback, isReturn, sessionId]
  )

  // Handheld scanners type into the field; it keeps focus so every scan lands in it
  useEffect(() => {
    const input = inputRef.current
    if (!input || !open) return
    const source = new ScanFieldSource(input)
    source.start((scan) => void onScan(scan.barcode))
    return () => source.stop()
  }, [open, onScan])

  useEffect(() => {
    if (!open) return
    const timer = setInterval(() => void heartbeat(sessionId), HEARTBEAT_MS)
    return () => clearInterval(timer)
  }, [open, heartbeat, sessionId])

  const end = async (confirmed: boolean) => {
    try {
      await endSession({ id: sessionId, confirmed }).unwrap()
      feedback.success(session?.direction === 'IN' ? (session && isReceipt(session.scenario) ? 'Received units added to stock' : 'Returned units added to stock') : 'Stock updated')
      router.back()
    } catch (e) {
      const found = (e as { data?: { differences?: ScanDifferences } })?.data?.differences
      if (found) {
        setDifferences(found)
        setChecked(false)
      } else feedback.error(apiErrorMessage(e, 'Could not end the session'))
    }
  }

  if (isLoading)
    return (
      <div className="flex justify-center p-12">
        <Spinner size="sm" />
      </div>
    )
  if (isError || !session) return <p className="p-8 text-center text-sm text-danger-600">This scan session could not be opened.</p>

  const meta = DIRECTION_META[session.direction]

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-text-primary">{session.ref}</h1>
        <Badge variant={meta.badge}>{meta.label}</Badge>
        {session.status !== 'IN_PROGRESS' && <Badge variant="secondary">{session.status === 'COMPLETED' ? 'Stock applied' : 'Discarded'}</Badge>}
        {session.status === 'IN_PROGRESS' && !session.mine && <Badge variant="warning">In use by {session.by.name}</Badge>}
        <span className="ml-auto text-sm text-text-muted">
          {session.scanned} scanned · {session.expected} expected
        </span>
      </div>

      {open && (
        <Card>
          <CardContent className="space-y-3 p-4">
            {isReturn && (
              <Select
                label="Condition of the next scans"
                helperText="Each scan keeps the condition it was scanned with. Damaged units go to the damaged bucket."
                value={condition}
                onChange={(event) => setCondition(event.target.value as ReturnCondition)}
                options={(session ? conditionsFor(session.scenario) : CONDITIONS).map((value) => ({ value, label: session && isReceipt(session.scenario) ? conditionName(session.scenario, value, conditionLabel(value)) : conditionLabel(value) }))}
              />
            )}
            <Input
              ref={inputRef}
              aria-label="Scan an item UPC"
              inputMode="none"
              autoComplete="off"
              autoFocus
              placeholder="Scan a UPC…"
              onBlur={() => setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0)}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-text-muted">
                <th className="p-3">Product</th>
                <th className="p-3 text-right">Expected</th>
                <th className="p-3 text-right">Scanned</th>
                <th className="p-3">State</th>
              </tr>
            </thead>
            <tbody>
              {session.lines.map((line) => (
                <tr key={line.inventoryItemId} className="border-b border-border last:border-0">
                  <td className="p-3">
                    <div className="font-medium text-text-primary">{line.sku}</div>
                    <div className="text-xs text-text-muted">
                      {line.channelSku ? `${line.channelSku} · ` : ''}UPC {line.upc ?? 'not set'}
                    </div>
                  </td>
                  <td className="p-3 text-right">{line.expected}</td>
                  <td className="p-3 text-right">{line.scanned}</td>
                  <td className="p-3">
                    <Badge variant={LINE_STATE_META[line.state].badge} size="sm">
                      {LINE_STATE_META[line.state].label}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <LatestScans session={session} canUndo={open} onUndo={(scanId) => void undoScan({ id: sessionId, scanId })} conditionLabel={conditionLabel} />

      {open && (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={async () => {
              await discard(sessionId).unwrap().catch((e) => feedback.failure(e, 'Could not discard'))
              router.back()
            }}
          >
            Discard session
          </Button>
          <Button disabled={session.scanned === 0 || ending} onClick={() => void end(false)}>
            End session
          </Button>
        </div>
      )}

      <Modal isOpen={differences !== null} onClose={() => setDifferences(null)} title="End this session?" size="sm">
        {differences && (
          <div className="space-y-3 text-sm">
            <ul className="space-y-1">
              {differences.short > 0 && <li>{differences.short} short of expected</li>}
              {differences.over > 0 && <li>{differences.over} over expected (not applied)</li>}
              {differences.notOnRecord > 0 && <li>{differences.notOnRecord} not on this record (not applied)</li>}
              {differences.unmatched > 0 && <li>{differences.unmatched} not in inventory (not applied)</li>}
            </ul>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />I checked the differences
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDifferences(null)}>
                Keep scanning
              </Button>
              <Button
                disabled={!checked || ending}
                onClick={() => {
                  setDifferences(null)
                  void end(true)
                }}
              >
                End session
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function LatestScans({
  session,
  canUndo,
  onUndo,
  conditionLabel,
}: {
  session: ScanSession
  canUndo: boolean
  onUndo: (scanId: number) => void
  conditionLabel: (value: ReturnCondition) => string
}) {
  if (session.latest.length === 0) return null
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <h2 className="text-xs font-medium uppercase tracking-wide text-text-muted">Latest scans</h2>
        {session.latest.map((scan) => (
          <div key={scan.id} className="flex flex-wrap items-center gap-2 text-sm">
            <code className="font-mono">{scan.upc}</code>
            {scan.sku && <span className="text-text-muted">{scan.sku}</span>}
            <Badge variant={SCAN_STATE_META[scan.state].badge} size="sm">
              {SCAN_STATE_META[scan.state].label}
            </Badge>
            {scan.condition && <Badge size="sm" variant="secondary">{conditionLabel(scan.condition)}</Badge>}
            <span className="ml-auto text-xs text-text-muted">{new Date(scan.scannedAt).toLocaleTimeString()}</span>
            {canUndo && (
              <Button size="sm" variant="ghost" onClick={() => onUndo(scan.id)}>
                Undo
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
