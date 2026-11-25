'use client'

import React, { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FloatingMenu } from '@/features/inventory/shipments/ShipmentParts'
import { Button } from '@/design-system/buttons'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useRefreshTrackingMutation } from '@/services/api/shipping.api'
import { cn } from '@/utils/cn'
import { BULK_BOOK_HREF } from '../../shippingMeta'
import type { OrderListItem } from '../../types'
import { BulkPrintDialog } from './BulkPrintDialog'
import { BulkVoidDialog } from './BulkVoidDialog'
import { BULK_LIMIT, canBulkBook, canBulkPrint, canBulkTrack, canBulkVoid, saveBulkOrders } from './bulkSelection'
import { runPool } from './pool'

const REFRESH_AT_ONCE = 3

interface BulkSelectionBarProps {
  rows: OrderListItem[]
  canWrite: boolean
  onClear: () => void
}

const trackingNumberOf = (row: OrderListItem) => row.booking?.trackingNumber ?? row.tracking[0]?.trackingNumber ?? null

/**
 * What the ticked orders can do together: Get rates (the To Book ones) and a Bulk actions menu for the booked ones:
 * print labels, refresh tracking, copy tracking numbers, cancel / void. Each item says how many of the selection it
 * acts on; the rest are left out (the dialogs list them with why).
 */
export const BulkSelectionBar: React.FC<BulkSelectionBarProps> = ({ rows, canWrite, onClear }) => {
  const router = useRouter()
  const { success, failure, info } = useApiFeedback()
  const anchor = useRef<HTMLSpanElement>(null)
  const [menu, setMenu] = useState(false)
  const [printing, setPrinting] = useState<number[] | null>(null)
  const [voiding, setVoiding] = useState<OrderListItem[] | null>(null)
  const [refresh] = useRefreshTrackingMutation()
  const [refreshing, setRefreshing] = useState<{ done: number; total: number } | null>(null)

  const toBook = rows.filter(canBulkBook)
  const printable = rows.filter(canBulkPrint)
  const trackable = rows.filter(canBulkTrack)
  const numbers = rows.map(trackingNumberOf).filter((value): value is string => Boolean(value))
  const voidable = rows.filter(canBulkVoid)

  const refreshTracking = async () => {
    let failed = 0
    setRefreshing({ done: 0, total: trackable.length })
    await runPool(trackable, REFRESH_AT_ONCE, async (row) => {
      try {
        if (row.booking) await refresh(row.booking.id).unwrap()
      } catch {
        failed += 1
      }
      setRefreshing((current) => current && { ...current, done: current.done + 1 })
    })
    setRefreshing(null)
    if (failed) failure(null, `Tracking could not be refreshed for ${failed} of ${trackable.length} parcels`)
    else success(`Tracking refreshed for ${trackable.length} parcel${trackable.length === 1 ? '' : 's'}`)
  }

  const copyNumbers = async () => {
    try {
      await navigator.clipboard.writeText(numbers.join('\n'))
      info(`${numbers.length} tracking number${numbers.length === 1 ? '' : 's'} copied`)
    } catch {
      failure(null, 'Could not copy to the clipboard')
    }
  }

  const items: { key: string; label: string; count: number; onSelect: () => void; danger?: boolean; write?: boolean }[] = [
    { key: 'print', label: 'Print labels', count: printable.length, onSelect: () => setPrinting(printable.map((row) => row.booking!.id)) },
    { key: 'track', label: 'Refresh tracking', count: trackable.length, onSelect: () => void refreshTracking() },
    { key: 'copy', label: 'Copy tracking numbers', count: numbers.length, onSelect: () => void copyNumbers() },
    { key: 'void', label: 'Cancel / void labels', count: voidable.length, onSelect: () => setVoiding(rows), danger: true, write: true },
  ]

  const getRates = () => {
    saveBulkOrders(toBook.map(({ channel, market, orderId }) => ({ channel: channel as 'walmart' | 'amazon' | 'temu', market, orderId })))
    router.push(BULK_BOOK_HREF)
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-primary-600 px-4 py-2.5 text-sm text-white">
        <b>{rows.length} selected</b>
        {rows.length >= BULK_LIMIT && <span className="text-white/80">(most {BULK_LIMIT} at a time)</span>}
        <button type="button" onClick={onClear} className="font-medium text-white/80 underline hover:text-white">
          Clear
        </button>
        <div className="ml-auto flex items-center gap-2">
          {canWrite && toBook.length > 0 && (
            <Button size="sm" variant="secondary" onClick={getRates}>
              Get rates ({toBook.length})
            </Button>
          )}
          <span ref={anchor}>
            <Button size="sm" variant="secondary" onClick={() => setMenu((open) => !open)} isLoading={refreshing !== null} aria-haspopup="menu" aria-expanded={menu}>
              {refreshing ? `Refreshing ${refreshing.done}/${refreshing.total}` : 'Bulk actions ▾'}
            </Button>
          </span>
        </div>
      </div>
      <FloatingMenu anchorRef={anchor} open={menu} onClose={() => setMenu(false)} width={260}>
        {items
          .filter((item) => !item.write || canWrite)
          .map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              disabled={item.count === 0}
              onClick={() => {
                setMenu(false)
                item.onSelect()
              }}
              className={cn('flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-secondary-50 disabled:cursor-not-allowed disabled:text-text-subtle disabled:hover:bg-transparent', item.danger && item.count > 0 && 'text-danger-600')}
            >
              {item.label}
              <span className="text-xs text-text-muted">
                {item.count} of {rows.length}
              </span>
            </button>
          ))}
      </FloatingMenu>
      <BulkPrintDialog shipmentIds={printing} onClose={() => setPrinting(null)} />
      <BulkVoidDialog rows={voiding} onClose={() => setVoiding(null)} />
    </>
  )
}
