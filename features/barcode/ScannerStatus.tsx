'use client'

import { Badge } from '@/design-system/badges'
import { Button } from '@/design-system/buttons'
import { Card, CardContent } from '@/design-system/cards'
import { BAUD_RATES, useBarcodeScanner } from './BarcodeScannerProvider'

export function ScannerStatus() {
  const { keyboardListening, serialSupported, serialConnected, serialError, serialNotice, baudSetting, setBaudSetting, connectSerial, failedScans } =
    useBarcodeScanner()

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={keyboardListening ? 'success' : 'secondary'}>
            Keyboard-mode scanners: {keyboardListening ? 'listening' : 'off'}
          </Badge>
          <Badge variant={serialConnected > 0 ? 'success' : 'secondary'}>
            {serialSupported
              ? serialConnected > 0
                ? `USB serial scanners: ${serialConnected} connected`
                : 'USB serial scanners: none connected'
              : 'USB serial: not supported in this browser'}
          </Badge>
          {failedScans > 0 && <Badge variant="error">{failedScans} scan(s) could not be saved</Badge>}

          {serialSupported && (
            <Button className="ml-auto" variant="secondary" onClick={() => void connectSerial()}>
              Connect USB serial scanner
            </Button>
          )}
        </div>

        {serialNotice && <p className="text-sm text-amber-600">{serialNotice}</p>}
        {serialError && <p className="text-sm text-red-600">{serialError}</p>}

        {serialSupported && (
          <details className="text-sm">
            <summary className="cursor-pointer text-text-muted">Advanced</summary>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="text-text-muted" htmlFor="barcode-baud">
                Baud rate
              </label>
              <select
                id="barcode-baud"
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-text-primary"
                value={baudSetting}
                onChange={(e) => setBaudSetting(e.target.value === 'auto' ? 'auto' : Number(e.target.value))}
              >
                <option value="auto">Automatic (recommended)</option>
                {BAUD_RATES.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}
                  </option>
                ))}
              </select>
              <span className="text-xs text-text-muted">
                Only real serial scanners care; USB virtual-COM scanners work at any rate.
              </span>
            </div>
          </details>
        )}
        <p className="text-xs text-text-muted">
          Any scanner works. Scanners in their default USB keyboard mode are captured while this tab is open (outside form
          fields). Scanners switched to USB serial / virtual COM mode are captured in the background after you connect
          them once; the browser remembers the device.
        </p>
      </CardContent>
    </Card>
  )
}
