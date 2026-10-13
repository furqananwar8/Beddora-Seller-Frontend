import type { ScanEvent, ScannerSource } from './types'

/**
 * Minimal Web Serial typings (not part of TypeScript's DOM lib).
 * https://developer.mozilla.org/docs/Web/API/Web_Serial_API
 */
interface SerialPortLike {
  readable: ReadableStream<Uint8Array> | null
  open(options: { baudRate: number }): Promise<void>
  close(): Promise<void>
  getInfo(): { usbVendorId?: number; usbProductId?: number }
}

interface SerialLike extends EventTarget {
  getPorts(): Promise<SerialPortLike[]>
  requestPort(options?: object): Promise<SerialPortLike>
}

const getSerial = (): SerialLike | undefined =>
  typeof navigator === 'undefined' ? undefined : (navigator as unknown as { serial?: SerialLike }).serial

/** Scanners without a line terminator are flushed once the port goes quiet. */
const IDLE_FLUSH_MS = 150

/** Rates tried, in this order, until a scanner's first scan comes through as readable text. */
const AUTO_BAUD_RATES = [9600, 115200, 19200, 38400, 57600]

export type BaudSetting = 'auto' | number

export const isWebSerialSupported = (): boolean => Boolean(getSerial())

export interface WebSerialStatus {
  /** Ports currently open and being read. */
  connected: number
  error?: string
  /** Shown while a scanner's baud rate is being worked out (the user is asked to scan again). */
  notice?: string
}

/** USB virtual-COM scanners ignore the baud rate; real serial ones garble text at the wrong one. */
const looksReadable = (text: string): boolean => {
  if (!text) return false
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    const printable = code === 9 || code === 10 || code === 13 || (code >= 32 && code < 127) || code >= 160
    if (!printable || code === 0xfffd) return false
  }
  return true
}

/** The rate that worked for each scanner (by USB id), so it is not worked out again. */
const BAUD_MEMORY_KEY = 'barcode_serial_baud_by_device'

const deviceKey = (info: { usbVendorId?: number; usbProductId?: number }): string =>
  `${info.usbVendorId ?? 'x'}:${info.usbProductId ?? 'x'}`

const readBaudMemory = (): Record<string, number> => {
  try {
    return JSON.parse(window.localStorage.getItem(BAUD_MEMORY_KEY) || '{}')
  } catch {
    return {}
  }
}

const rememberBaud = (key: string, baudRate: number): void => {
  try {
    window.localStorage.setItem(BAUD_MEMORY_KEY, JSON.stringify({ ...readBaudMemory(), [key]: baudRate }))
  } catch {
    /* storage unavailable: it is just worked out again next time */
  }
}

/**
 * Any scanner switched to USB serial / virtual COM mode. The browser opens the port directly, so scans
 * arrive no matter which window or field has focus (as long as the tab is open).
 * No vendor filter: the user picks whichever serial device is their scanner.
 */
export class WebSerialSource implements ScannerSource {
  readonly id = 'serial' as const

  private onScan?: (scan: ScanEvent) => void
  private open = new Map<SerialPortLike, AbortController>()
  private stopped = true
  private notice?: string
  private lastError?: string

  constructor(
    private baudSetting: BaudSetting,
    private onStatus: (status: WebSerialStatus) => void
  ) {}

  setBaudSetting(setting: BaudSetting): void {
    this.baudSetting = setting
  }

  /** Reconnects scanners the user already allowed, and any that get plugged in later. */
  start(onScan: (scan: ScanEvent) => void): void {
    const serial = getSerial()
    if (!serial) return
    this.onScan = onScan
    this.stopped = false
    serial.addEventListener('connect', this.openGranted)
    serial.addEventListener('disconnect', this.report)
    void this.openGranted()
  }

  stop(): void {
    this.stopped = true
    const serial = getSerial()
    serial?.removeEventListener('connect', this.openGranted)
    serial?.removeEventListener('disconnect', this.report)
    for (const [port, abort] of this.open) {
      abort.abort()
      void port.close().catch(() => undefined)
    }
    this.open.clear()
  }

  /** Needs a click: the browser asks the user which serial device to allow. */
  async requestAndConnect(): Promise<void> {
    const serial = getSerial()
    if (!serial) throw new Error('This browser does not support Web Serial (use Chrome or Edge).')
    this.stopped = false
    const port = await serial.requestPort()
    await this.read(port, 0)
  }

  private openGranted = async (): Promise<void> => {
    const serial = getSerial()
    if (!serial || this.stopped) return
    for (const port of await serial.getPorts()) {
      if (!this.open.has(port)) await this.read(port, 0)
    }
  }

  private report = (): void => {
    this.onStatus({ connected: this.open.size, error: this.lastError, notice: this.notice })
  }

  private setStatus(next: { error?: string; notice?: string }): void {
    this.lastError = next.error
    this.notice = next.notice
    this.report()
  }

  /** Baud rates to try for a scanner: the one set by hand, else the remembered one, then the usual ones. */
  private candidates(port: SerialPortLike): number[] {
    if (this.baudSetting !== 'auto') return [this.baudSetting]
    const remembered = readBaudMemory()[deviceKey(port.getInfo())]
    return [...new Set([...(remembered ? [remembered] : []), ...AUTO_BAUD_RATES])]
  }

  private async read(port: SerialPortLike, attempt: number): Promise<void> {
    if (this.open.has(port)) return
    const rates = this.candidates(port)
    const baudRate = rates[attempt]
    if (baudRate === undefined) {
      this.setStatus({ error: 'Could not read this scanner at any baud rate. Check it is in USB serial mode.' })
      return
    }

    try {
      await port.open({ baudRate })
    } catch (error) {
      // Already open in another tab or program
      this.setStatus({ error: error instanceof Error ? error.message : 'Could not open the scanner port' })
      return
    }

    const abort = new AbortController()
    this.open.set(port, abort)
    this.setStatus({ notice: this.notice })

    const garbled = await this.loop(port, abort, baudRate)
    if (garbled && !this.stopped && this.baudSetting === 'auto') {
      const next = rates[attempt + 1]
      this.setStatus(
        next === undefined
          ? { error: 'Could not read this scanner at any baud rate. Check it is in USB serial mode.' }
          : { notice: `The scanner's first scan was unreadable at ${baudRate} baud. Scan any barcode again to try ${next}.` }
      )
      if (next !== undefined) await this.read(port, attempt + 1)
    }
  }

  /** Reads one port until it closes. Returns true when the first scan was unreadable (wrong baud rate). */
  private async loop(port: SerialPortLike, abort: AbortController, baudRate: number): Promise<boolean> {
    const info = port.getInfo()
    const device = {
      ...(info.usbVendorId !== undefined && { usbVendorId: info.usbVendorId }),
      ...(info.usbProductId !== undefined && { usbProductId: info.usbProductId }),
    }
    const emit = (barcode: string) => {
      const text = barcode.trim()
      if (text) this.onScan?.({ barcode: text, source: this.id, device, scannedAt: new Date().toISOString() })
    }

    let buffer = ''
    let verified = false
    let garbled = false
    let idle: ReturnType<typeof setTimeout> | undefined
    const decoder = new TextDecoder()

    try {
      const reader = port.readable?.getReader()
      if (!reader) return false
      abort.signal.addEventListener('abort', () => void reader.cancel().catch(() => undefined))

      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })

        // The first data of a scanner proves the baud rate: readable text keeps it, anything else tries the next one
        if (!verified) {
          if (!looksReadable(text)) {
            garbled = true
            abort.abort()
            break
          }
          verified = true
          rememberBaud(deviceKey(info), baudRate)
          this.setStatus({})
        }

        buffer += text
        // Every complete line (CR, LF or CRLF terminated) is one scan
        const lines = buffer.split(/\r\n|\r|\n/)
        buffer = lines.pop() ?? ''
        lines.forEach(emit)

        clearTimeout(idle)
        if (buffer) {
          idle = setTimeout(() => {
            emit(buffer)
            buffer = ''
          }, IDLE_FLUSH_MS)
        }
      }
    } catch (error) {
      if (!abort.signal.aborted) this.setStatus({ error: error instanceof Error ? error.message : 'Scanner connection lost' })
    } finally {
      clearTimeout(idle)
      this.open.delete(port)
      await port.close().catch(() => undefined)
      this.report()
    }
    return garbled
  }
}
