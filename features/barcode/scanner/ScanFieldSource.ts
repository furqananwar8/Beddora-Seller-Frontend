import type { ScanEvent, ScannerSource } from './types'

/** A scanner fills the field faster than a person types: average gaps stay well under this. */
const MAX_AVG_GAP_MS = 50
/** Scanners set to send no Enter/Tab at the end are flushed once the field goes quiet. */
const IDLE_FLUSH_MS = 300
/** Shortest text taken as a scan without Enter/Tab: a stray key press or two is not a code. */
const MIN_IDLE_LENGTH = 3

/**
 * ISO 15434 separators (FedEx / UPS label codes) by the key a scanner presses with Ctrl to send them:
 * FS, GS, RS, US and EOT. A field cannot take these as typed text, so they are added to it by hand.
 */
const CONTROL_BY_CTRL_KEY: Record<string, string> = {
  '\\': '\x1c',
  ']': '\x1d',
  '^': '\x1e',
  '6': '\x1e',
  _: '\x1f',
  '-': '\x1f',
  d: '\x04',
}

const controlCharacter = (event: KeyboardEvent): string | undefined =>
  event.ctrlKey && !event.altKey && !event.metaKey ? CONTROL_BY_CTRL_KEY[event.key.toLowerCase()] : undefined

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
    const control = controlCharacter(event)
    if (control) {
      // Separators of shipping-label codes, sent by the scanner as Ctrl+key: kept in the code
      event.preventDefault()
      this.input.value += control
      this.handleInput()
      return
    }
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
      if (avgGap <= MAX_AVG_GAP_MS && this.input.value.trim().length >= MIN_IDLE_LENGTH) this.flush()
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
