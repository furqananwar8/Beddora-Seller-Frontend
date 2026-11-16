'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/design-system/buttons'
import { useLazyGetScanLineScansQuery, type ScanLineScans } from '@/services/api/barcode.api'

const PAGE = 10
const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

interface Props {
  sessionId: number
  inventoryItemId: number
  /** How many of this product are matched now: a change reloads what is shown, so live scans appear. */
  scanned: number
  conditionLabel?: (value: NonNullable<ScanLineScans['items'][number]['condition']>) => string
  /** Present while the session is open and yours: each row can then be removed (an accidental double scan). */
  onRemove?: (scanId: number) => Promise<void>
}

/**
 * One product's matched UPCs, newest first: ten at a time, with See more for the rest. A product scanned many times
 * stays one row in the session table; this is what opens under it.
 */
export function MatchedScans({ sessionId, inventoryItemId, scanned, conditionLabel, onRemove }: Props) {
  const [load] = useLazyGetScanLineScansQuery()
  const [items, setItems] = useState<ScanLineScans['items']>([])
  const [total, setTotal] = useState(0)
  const [busy, setBusy] = useState(false)
  const shown = useRef(PAGE)
  shown.current = Math.max(PAGE, items.length)

  // The first page, and again whenever more units are matched (keeping as many rows as were open)
  useEffect(() => {
    let cancelled = false
    void load({ id: sessionId, inventoryItemId, offset: 0, limit: shown.current }).unwrap().then((page) => {
      if (cancelled) return
      setItems(page.items)
      setTotal(page.total)
    }).catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [load, sessionId, inventoryItemId, scanned])

  const seeMore = useCallback(async () => {
    setBusy(true)
    try {
      const page = await load({ id: sessionId, inventoryItemId, offset: items.length, limit: PAGE }).unwrap()
      setItems((current) => [...current, ...page.items.filter((row) => !current.some((c) => c.id === row.id))])
      setTotal(page.total)
    } finally {
      setBusy(false)
    }
  }, [items.length, inventoryItemId, load, sessionId])

  if (items.length === 0) return <p className="px-3 py-2 text-xs text-text-muted">No matched UPCs yet.</p>

  return (
    <div className="px-3 py-2">
      <ul className="divide-y divide-border rounded-md border border-border bg-surface text-xs">
        {items.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
            <span className="font-mono">{row.upc}</span>
            <span className="text-text-muted">
              {row.condition && conditionLabel ? `${conditionLabel(row.condition)} · ` : ''}
              {time(row.scannedAt)}
              {onRemove && (
                <button type="button" aria-label={`Remove scan ${row.upc}`} title="Remove this scan" onClick={() => void onRemove(row.id)} className="ml-3 font-semibold text-danger-600 hover:underline">
                  Remove
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
        <span>
          Showing {items.length} of {total}
        </span>
        {items.length < total && (
          <Button type="button" variant="ghost" size="sm" onClick={() => void seeMore()} disabled={busy}>
            {busy ? 'Loading…' : 'See more'}
          </Button>
        )}
      </div>
    </div>
  )
}
