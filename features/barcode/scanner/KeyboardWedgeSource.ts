import type { ScanEvent, ScannerSource } from './types'

/** A scanner types faster than a person: gaps between its characters stay well under this. */
const MAX_GAP_MS = 50
/** Shortest text that counts as a code (a person's quick typing of a few letters is not a scan). */
const MIN_LENGTH = 3
/** Scanners that send no Enter/Tab at the end are flushed once the input goes quiet. */
const IDLE_FLUSH_MS = 120

const isEditable = (target: EventTarget | null): boolean => {
  const el = target as HTMLElement | null
  if (!el || !el.tagName) return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

/**
 * Scanners in the default "USB keyboard" (HID) mode: every barcode arrives as a burst of key presses
 * ending in Enter (or Tab). Works with any scanner, but only while this tab has focus.
 * Bursts typed into a form field are left alone, so data entry by scanner keeps working.
 */
export class KeyboardWedgeSource implements ScannerSource {
  readonly id = 'keyboard' as const

  private buffer = ''
  private lastKeyAt = 0
  private idleTimer?: ReturnType<typeof setTimeout>
  private onScan?: (scan: ScanEvent) => void

  start(onScan: (scan: ScanEvent) => void): void {
    this.onScan = onScan
    window.addEventListener('keydown', this.handleKey, true)
  }

  stop(): void {
    window.removeEventListener('keydown', this.handleKey, true)
    this.reset()
  }

  private handleKey = (event: KeyboardEvent): void => {
    if (event.isComposing || event.ctrlKey || event.altKey || event.metaKey || isEditable(event.target)) {
      this.reset()
      return
    }

    const now = performance.now()
    if (now - this.lastKeyAt > MAX_GAP_MS) this.buffer = ''
    this.lastKeyAt = now

    if (event.key === 'Enter' || event.key === 'Tab') {
      if (this.flush()) event.preventDefault()
      return
    }

    if (event.key.length !== 1) return // Shift, arrows, function keys...
    this.buffer += event.key
    clearTimeout(this.idleTimer)
    this.idleTimer = setTimeout(() => this.flush(), IDLE_FLUSH_MS)
  }

  private reset(): void {
    clearTimeout(this.idleTimer)
    this.buffer = ''
  }

  /** Emits the buffered burst as a scan when it is long enough; returns whether it did. */
  private flush(): boolean {
    clearTimeout(this.idleTimer)
    const barcode = this.buffer.trim()
    this.buffer = ''
    if (barcode.length < MIN_LENGTH) return false
    this.onScan?.({ barcode, source: this.id, scannedAt: new Date().toISOString() })
    return true
  }
}
