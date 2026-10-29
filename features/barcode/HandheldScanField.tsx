'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { Badge } from '@/design-system/badges'
import { Button } from '@/design-system/buttons'
import { Card, CardContent } from '@/design-system/cards'
import { Input } from '@/design-system/inputs'
import type { BarcodeScan } from '@/services/api/barcode.api'
import { useBarcodeScanner } from './BarcodeScannerProvider'
import { ScanCard } from './ScanCard'
import { ScanGuide } from './ScanGuide'
import { ScanFieldSource } from './scanner/ScanFieldSource'
import type { ScanEvent } from './scanner/types'

type SaveState = 'saving' | 'saved' | 'failed'

const STATE_BADGE: Record<SaveState, { variant: 'secondary' | 'success' | 'error'; label: string }> = {
  saving: { variant: 'secondary', label: 'Saving…' },
  saved: { variant: 'success', label: 'Saved' },
  failed: { variant: 'error', label: 'Not saved' },
}

const isEditable = (el: Element | null): boolean =>
  !!el && ((el as HTMLElement).isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

/**
 * Keeps the field focused so a scan always lands in it: on load, after a tap elsewhere on the page and
 * when the user returns to the tab. Focus moving to another field (e.g. search) is left alone.
 */
function useStickyFocus(ref: RefObject<HTMLInputElement>, enabled: boolean): void {
  useEffect(() => {
    const input = ref.current
    if (!input || !enabled) return

    const refocus = () => {
      if (document.visibilityState === 'visible' && !isEditable(document.activeElement)) input.focus({ preventScroll: true })
    }
    // Wait for the blur to settle, so a tap on another field keeps its focus
    const onBlur = () => setTimeout(refocus, 0)

    refocus()
    input.addEventListener('blur', onBlur)
    window.addEventListener('focus', refocus)
    document.addEventListener('visibilitychange', refocus)
    return () => {
      input.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', refocus)
      document.removeEventListener('visibilitychange', refocus)
    }
  }, [ref, enabled])
}

interface LatestScan {
  scan: ScanEvent
  state: SaveState
  /** The saved scan with its content parsed by the server; set once saved. */
  saved?: BarcodeScan
}

/** The last code scanned on this device: its full parsed content once saved, the raw code until then. */
function LatestScanResult({ latest }: { latest: LatestScan }) {
  const badge = STATE_BADGE[latest.state]
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">Latest scan</span>
        <Badge variant={badge.variant} size="sm">
          {badge.label}
        </Badge>
      </div>
      {latest.saved ? (
        <ScanCard scan={latest.saved} />
      ) : (
        <code className="block break-all rounded-lg bg-surface-secondary p-3 font-mono text-lg font-semibold text-text-primary">
          {latest.scan.barcode}
        </code>
      )}
    </div>
  )
}

/**
 * Where a handheld Android scanner (e.g. Zebra TC57 with DataWedge) types its codes. Ready as soon as the
 * page opens: press the trigger and the code is saved and shown. The field only receives the raw code
 * and clears after each scan; the result is shown in full below it. The on-screen keyboard stays hidden.
 */
export function HandheldScanField() {
  const { recordScan, canScan } = useBarcodeScanner()
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)
  const [latest, setLatest] = useState<LatestScan>()

  useStickyFocus(inputRef, canScan)

  const onScan = useCallback(
    async (scan: ScanEvent) => {
      setLatest({ scan, state: 'saving' })
      const saved = await recordScan(scan)
      // A newer scan may have replaced this one meanwhile
      setLatest((prev) =>
        prev?.scan === scan ? { scan, state: saved ? 'saved' : 'failed', saved: saved ?? undefined } : prev
      )
    },
    [recordScan]
  )

  useEffect(() => {
    const input = inputRef.current
    if (!input || !canScan) return
    const source = new ScanFieldSource(input)
    source.start(onScan)
    return () => source.stop()
  }, [canScan, onScan])

  if (!canScan) return null

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={focused ? 'success' : 'error'}>
            {focused ? 'Handheld scanner: connected' : 'Handheld scanner: disconnected'}
          </Badge>
          <span className="text-sm text-text-muted">
            {focused ? 'Press the scanner trigger to scan.' : 'Tap "Connect scanner" before scanning.'}
          </span>
          {!focused && (
            <Button variant="secondary" onClick={() => inputRef.current?.focus({ preventScroll: true })}>
              Connect scanner
            </Button>
          )}
        </div>
        <Input
          ref={inputRef}
          aria-label="Handheld scanner"
          inputMode="none"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="done"
          placeholder="Waiting for a scan… (the code is captured here, then shown in full below)"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {latest && <LatestScanResult latest={latest} />}
        <ScanGuide />
      </CardContent>
    </Card>
  )
}
