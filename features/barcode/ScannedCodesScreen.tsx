'use client'

import { useState } from 'react'
import { Button } from '@/design-system/buttons'
import { Card, CardContent } from '@/design-system/cards'
import { Input } from '@/design-system/inputs'
import { Spinner } from '@/design-system/loaders'
import { useGetBarcodeScansQuery } from '@/services/api/barcode.api'
import { HandheldScanField } from './HandheldScanField'
import { ScanCard } from './ScanCard'
import { ScannerStatus } from './ScannerStatus'
import { DESKTOP_SCANNERS_ENABLED } from './scannerConfig'

const PAGE_SIZE = 24
/** New scans from other users/devices show up without a reload. */
const REFRESH_MS = 10_000

export function ScannedCodesScreen() {
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
          <h1 className="text-2xl font-bold text-text-primary">Scanned Codes</h1>
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

      <HandheldScanField />
      {DESKTOP_SCANNERS_ENABLED && <ScannerStatus />}

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
