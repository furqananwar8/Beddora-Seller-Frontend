'use client'

import { useState } from 'react'
import { Badge } from '@/design-system/badges'
import { Button } from '@/design-system/buttons'
import { Card, CardContent } from '@/design-system/cards'
import { Input } from '@/design-system/inputs'
import { Spinner } from '@/design-system/loaders'
import { useGetBarcodeScansQuery } from '@/services/api/barcode.api'
import { BAUD_RATES, useBarcodeScanner } from './BarcodeScannerProvider'
import { ScanCard } from './ScanCard'

const PAGE_SIZE = 24
/** New scans from other users/devices show up without a reload. */
const REFRESH_MS = 10_000

function ScannerStatus() {
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

export function BarcodeScreen() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const { data, isFetching } = useGetBarcodeScansQuery(
    { page, limit: PAGE_SIZE, search: search.trim() || undefined },
    { pollingInterval: REFRESH_MS }
  )

  return (
    <div className="space-y-6 px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Bar Code</h1>
          <p className="text-sm text-text-muted">Every code scanned shows up here, newest first.</p>
        </div>
        <div className="w-full max-w-xs">
          <Input
            type="text"
            placeholder="Search scanned code"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>

      <ScannerStatus />

      {!data ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : data.data.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-text-muted">
            {search ? 'No scans match your search.' : 'No scans yet. Scan a barcode to see it here.'}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.data.map((scan) => (
              <ScanCard key={scan.id} scan={scan} />
            ))}
          </div>

          <div className="flex items-center justify-between text-sm text-text-muted">
            <span>
              {data.totalRecords} scan{data.totalRecords === 1 ? '' : 's'}
              {isFetching ? ' · updating…' : ''}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span>
                Page {data.page} of {Math.max(data.totalPages, 1)}
              </span>
              <Button variant="secondary" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
