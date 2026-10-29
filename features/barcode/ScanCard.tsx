'use client'

import { Badge } from '@/design-system/badges'
import { Card, CardContent } from '@/design-system/cards'
import type { BarcodeScan } from '@/services/api/barcode.api'
import { DATA_TYPE_LABEL, gs1Label, gs1Value, isPlainObject } from './barcodeContent'
import { ValueRow, ValueRows } from './ValueView'

const SOURCE_LABEL: Record<BarcodeScan['source'], string> = {
  serial: 'USB serial',
  keyboard: 'Keyboard mode',
  handheld: 'Handheld scanner',
}

const formatScannedAt = (iso: string): string =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(iso))

const hex = (value: unknown): string => `0x${Number(value).toString(16).padStart(4, '0')}`

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="break-all text-right font-medium text-text-primary">{value}</span>
    </div>
  )
}

/** The headline of a card: the code itself for plain codes, what it is for structured ones. */
function headline(scan: BarcodeScan): string {
  switch (scan.dataType) {
    case 'json':
      return 'JSON data'
    case 'keyvalue':
      return 'Key / value data'
    case 'gs1':
      return 'GS1 code'
    case 'url':
      return isPlainObject(scan.payload) && typeof scan.payload.host === 'string' ? scan.payload.host : 'Link'
    default:
      return scan.barcode
  }
}

/** The parsed content, in the shape of its type. */
function Content({ scan }: { scan: BarcodeScan }) {
  if (scan.payload === null || scan.payload === undefined) return null

  return (
    <div className="space-y-1.5 rounded-lg bg-surface-secondary p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-text-muted">Barcode data</div>
      {scan.dataType === 'gs1' && isPlainObject(scan.payload) ? (
        Object.entries(scan.payload).map(([identifier, value]) => (
          <ValueRow key={identifier} label={gs1Label(identifier)} value={gs1Value(identifier, String(value))} />
        ))
      ) : (
        <ValueRows value={scan.payload} />
      )}
      <code className="mt-2 block line-clamp-2 break-all text-xs text-text-muted">{scan.barcode}</code>
    </div>
  )
}

/** One scan: the code, when and how it was read, and its content shown according to what it holds. */
export function ScanCard({ scan }: { scan: BarcodeScan }) {
  const device = scan.device as { usbVendorId?: number; usbProductId?: number } | null

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 break-all font-mono text-lg font-semibold text-text-primary">{headline(scan)}</div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge variant="primary" size="sm" className="whitespace-nowrap border-transparent bg-slate-800 text-white">
              {DATA_TYPE_LABEL[scan.dataType] ?? scan.dataType}
            </Badge>
            <Badge variant={scan.source !== 'keyboard' ? 'success' : 'secondary'} size="sm" className="whitespace-nowrap">
              {SOURCE_LABEL[scan.source]}
            </Badge>
          </div>
        </div>

        <div className="space-y-1.5 border-t border-border pt-3">
          <Detail label="Scanned" value={formatScannedAt(scan.scannedAt)} />
          {scan.scannedBy && <Detail label="Scanned by" value={scan.scannedBy.name || `User ${scan.scannedBy.id}`} />}
          {device?.usbVendorId !== undefined && (
            <Detail label="Scanner (USB id)" value={`${hex(device.usbVendorId)}:${hex(device.usbProductId)}`} />
          )}
        </div>

        <Content scan={scan} />
      </CardContent>
    </Card>
  )
}
