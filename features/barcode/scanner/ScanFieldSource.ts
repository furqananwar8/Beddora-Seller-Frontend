import type { ScanEvent, ScannerSource } from './types'

/** A scanner fills the field faster than a person types: average gaps stay well under this. */
const MAX_AVG_GAP_MS = 50
/** Scanners set to send no Enter/Tab at the end are flushed once the field goes quiet. */
const IDLE_FLUSH_MS = 150

/**
 * Handheld Android scanners (Zebra DataWedge, Honeywell, ...) in keystroke-output mode: the code is
 * typed into the focused field, often as one text chunk with no key events Chrome can identify.
 * Reading the field's value instead of key presses captures it however the scanner delivers it.
 */
export class ScanFieldSource implements ScannerSource {
  readonly id = 'handheld' as const

  private firstInputAt = 0
  private lastInputAt = 0
  private idleTimer?: ReturnType<typeof setTimeout>
  private onScan?: (scan: ScanEvent) => void

  constructor(private readonly input: HTMLInputElement) {}

  start(onScan: (scan: ScanEvent) => void): void {
    this.onScan = onScan
    this.input.addEventListener('keydown', this.handleKey)
    this.input.addEventListener('input', this.handleInput)
  }

  stop(): void {
    this.input.removeEventListener('keydown', this.handleKey)
    this.input.removeEventListener('input', this.handleInput)
    clearTimeout(this.idleTimer)
  }

  private handleKey = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== 'Tab') return
    event.preventDefault()
    this.flush()
  }

  private handleInput = (): void => {
    const now = performance.now()
    if (!this.firstInputAt) this.firstInputAt = now
    this.lastInputAt = now
    clearTimeout(this.idleTimer)
    this.idleTimer = setTimeout(() => {
      // A person typing by hand finishes with Enter; only a fast burst is taken as a scan
      const avgGap = (this.lastInputAt - this.firstInputAt) / Math.max(this.input.value.length - 1, 1)
      if (avgGap <= MAX_AVG_GAP_MS) this.flush()
    }, IDLE_FLUSH_MS)
  }

  private flush(): void {
    clearTimeout(this.idleTimer)
    const barcode = this.input.value.trim()
    this.input.value = ''
    this.firstInputAt = 0
    if (barcode) this.onScan?.({ barcode, source: this.id, scannedAt: new Date().toISOString() })
  }
}
