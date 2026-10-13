import type { ScanSource } from '@/services/api/barcode.api'

/** One code read by a scanner, whatever the scanner model or how it reaches the browser. */
export interface ScanEvent {
  barcode: string
  source: ScanSource
  /** What the browser knows about the scanner (e.g. USB vendor / product id), when it exposes it. */
  device?: Record<string, unknown>
  scannedAt: string
}

/**
 * A way a scanner's data reaches the app. Every source turns raw input into ScanEvents, so the rest
 * of the app (saving, showing) does not care which kind of scanner produced them.
 */
export interface ScannerSource {
  readonly id: ScanSource
  start(onScan: (scan: ScanEvent) => void): void
  stop(): void
}
