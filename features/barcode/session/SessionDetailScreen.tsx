'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Badge } from '@/design-system/badges'
import { Button } from '@/design-system/buttons'
import { Card, CardContent } from '@/design-system/cards'
import { Spinner } from '@/design-system/loaders'
import { useGetScanSessionQuery } from '@/services/api/barcode.api'
import { ScanSessionModal } from './ScanSessionModal'
import { DIRECTION_META, SOURCE_LABEL, channelName, isReceipt, sessionCode } from './scanSession'
import { StatusChip } from './StatusChip'

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '-')
const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

/** One finished (or running) session: who, when, what matched and moved inventory, and the UPCs to fix and scan again. */
export function SessionDetailScreen({ sessionId }: { sessionId: number }) {
  const router = useRouter()
  const { data: session, isLoading, isError } = useGetScanSessionQuery(sessionId)
  // A session that is yours and still running continues in the scan modal
  const [dismissed, setDismissed] = useState(false)

  if (isLoading)
    return (
      <div className="flex justify-center p-12">
        <Spinner size="sm" />
      </div>
    )
  if (isError || !session) return <p className="p-8 text-center text-sm text-danger-600">This scan session could not be opened.</p>

  const direction = DIRECTION_META[session.direction]
  const receipt = isReceipt(session.scenario)
  const countOnly = session.appliesOn === 'RECEIPT'
  const matchedRows = session.applied.filter((row) => row.scanned > 0)
  const resumable = session.status === 'IN_PROGRESS' && session.mine

  return (
    <div className="space-y-5 px-6 py-6">
      <div>
        <Button variant="outline" onClick={() => router.push('/dashboard/barcode')}>
          Back to scan sessions
        </Button>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-text-primary">
            Session {sessionCode(session.id)} · {SOURCE_LABEL[session.scenario]} {session.ref}
          </h1>
          <StatusChip session={session} size="md" />
          <Badge variant="secondary">{direction.label}</Badge>
          {resumable && (
            <Button className="ml-auto" onClick={() => setDismissed(false)}>
              Resume scanning
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-4 md:grid-cols-3 xl:grid-cols-6">
          {[
            ['Source', receipt ? 'Inbound receiving' : session.scenario === 'FBM_ORDER' ? 'Shipping order' : 'Shipment'],
            ['Channel', channelName(session.channel)],
            ['Started', when(session.startedAt)],
            ['Ended', when(session.endedAt)],
            ['Started by', session.startedBy.name ?? '-'],
            [countOnly ? 'Counted for the receipt' : 'Inventory updated', countOnly ? (session.status === 'COMPLETED' ? `${when(session.endedAt)} · ${session.matched} unit${session.matched === 1 ? '' : 's'} counted (inventory updates when the receipt is signed)` : 'Not yet') : session.status === 'COMPLETED' ? `${when(session.endedAt)} · ${session.unitsApplied} unit${session.unitsApplied === 1 ? '' : 's'} ${session.direction === 'IN' ? 'in' : 'out'}` : 'Not yet'],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-xs text-text-muted">{label}</div>
              <div className="mt-1 text-sm font-semibold text-text-primary">{value}</div>
            </div>
          ))}
        </CardContent>
      </Card>
      {session.by.id !== session.startedBy.id && <p className="-mt-2 text-xs text-text-muted">Taken over by {session.by.name}: the scans were kept and the session continued under their name.</p>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ['UPCs scanned', session.scanned, ''],
          [`Matched (${matchedRows.length} SKU${matchedRows.length === 1 ? '' : 's'})`, session.matched, 'text-success-700'],
          [`Not matched (${session.unmatched.length} UPC${session.unmatched.length === 1 ? '' : 's'})`, session.notMatched, session.notMatched > 0 ? 'text-warning-700' : ''],
          [countOnly ? 'Units counted for the receipt' : 'Units adjusted in inventory', countOnly ? session.matched : session.unitsApplied, ''],
        ].map(([label, value, tone]) => (
          <Card key={String(label)}>
            <CardContent className="p-4">
              <div className="text-xs font-semibold text-text-muted">{label}</div>
              <div className={`mt-1 text-2xl font-bold ${tone}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-border px-4 py-3 text-sm font-bold">Matched SKUs · {countOnly ? 'counted for the receipt' : 'inventory adjusted'}</div>
          <table className="w-full text-sm">
            <thead className="bg-secondary-100 text-xs text-secondary-600">
              <tr>
                <th className="px-4 py-2.5 font-semibold text-center align-middle">SKU</th>
                <th className="px-4 py-2.5 font-semibold text-center align-middle">UPC</th>
                <th className="px-4 py-2.5 font-semibold text-center align-middle">ASIN</th>
                <th className="px-4 py-2.5 text-center font-semibold align-middle">Expected</th>
                <th className="px-4 py-2.5 text-center font-semibold align-middle">Scanned</th>
                <th className="px-4 py-2.5 text-center font-semibold align-middle">{countOnly ? 'Counted' : 'Inventory change'}</th>
              </tr>
            </thead>
            <tbody>
              {matchedRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-text-muted">
                    No code matched.
                  </td>
                </tr>
              )}
              {matchedRows.map((row) => (
                <tr key={row.inventoryItemId} className="border-t border-border">
                  <td className="px-4 py-2.5 font-mono text-xs text-center align-middle">{row.sku}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-center align-middle">{row.upc ?? '-'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-center align-middle">{row.asin ?? '-'}</td>
                  <td className="px-4 py-2.5 text-center align-middle">{row.expected}</td>
                  <td className="px-4 py-2.5 text-center align-middle">{row.scanned}</td>
                  <td className="px-4 py-2.5 text-center align-middle">
                    {countOnly ? (
                      <Badge variant="secondary" size="sm">
                        {row.scanned} counted
                      </Badge>
                    ) : session.status === 'COMPLETED' ? (
                      <Badge variant={session.direction === 'IN' ? 'success' : 'secondary'} size="sm">
                        {session.direction === 'IN' ? '+' : '-'}
                        {row.applied} {session.direction === 'IN' ? 'in' : 'out'}
                      </Badge>
                    ) : (
                      <span className="text-text-muted">Not applied yet</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <span className="text-sm font-bold">Not matched · not adjusted</span>
            <span className="text-sm text-text-muted">Add the UPC to the product, then scan these again in a new session.</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-secondary-100 text-xs text-secondary-600">
              <tr>
                <th className="px-4 py-2.5 font-semibold text-center align-middle">Scanned UPC</th>
                <th className="px-4 py-2.5 font-semibold text-center align-middle">Reason</th>
                <th className="px-4 py-2.5 font-semibold text-center align-middle">Product</th>
                <th className="px-4 py-2.5 text-center font-semibold align-middle">Times scanned</th>
                <th className="px-4 py-2.5 font-semibold text-center align-middle">First / last scanned</th>
              </tr>
            </thead>
            <tbody>
              {session.unmatched.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-text-muted">
                    Every scanned UPC matched.
                  </td>
                </tr>
              )}
              {session.unmatched.map((row) => (
                <tr key={row.upc} className="border-t border-border">
                  <td className="px-4 py-2.5 font-mono text-xs text-center align-middle">{row.upc}</td>
                  <td className="px-4 py-2.5 text-center align-middle">
                    <Badge variant={row.reason === 'NOT_IN_CATALOG' ? 'error' : 'warning'} size="sm">
                      {row.reason === 'NOT_IN_CATALOG' ? 'UPC not in catalog' : 'Not on this record'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-center align-middle">{row.sku ?? '-'}</td>
                  <td className="px-4 py-2.5 text-center align-middle">{row.count}</td>
                  <td className="px-4 py-2.5 text-center align-middle">
                    {clock(row.firstScannedAt)} / {clock(row.lastScannedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {resumable && !dismissed && <ScanSessionModal sessionId={session.id} onClose={() => setDismissed(true)} />}
    </div>
  )
}
