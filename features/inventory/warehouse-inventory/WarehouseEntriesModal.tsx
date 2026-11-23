'use client'

import React from 'react'
import { Modal } from '@/design-system/modals'
import { Spinner } from '@/design-system/loaders'
import { NewTabLink } from '@/components/new-tab-link/NewTabLink'
import { CONTAINER_ROUTES } from '@/features/procurement/containers/routes'
import { orderSearchHref } from '@/features/shipping/shippingMeta'
import { useGetWarehouseEntriesQuery, type WarehouseEntry, type WarehouseEntryKind } from '@/services/api/warehouseInventory.api'

interface WarehouseEntriesModalProps {
  /** The SKU and which count was clicked; null keeps the modal closed. */
  target: { product: { id: number; sku: string; name: string }; kind: WarehouseEntryKind } | null
  onClose: () => void
  /** Shows the other history (a damaged return is listed in both). */
  onSwitch?: (kind: WarehouseEntryKind) => void
}

/** Where each kind of record opens: the container, the shipment in the Shipments list, the order in Shipping Orders. */
const recordHref = (record: NonNullable<WarehouseEntry['record']>) =>
  record.type === 'container' ? CONTAINER_ROUTES.detail(record.id) : record.type === 'order' ? orderSearchHref(record.id) : `/dashboard/inventory/shipments?search=${encodeURIComponent(`SHP-${record.id.padStart(4, '0')}`)}`

const WHEN = (iso: string) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })

/** Every time damaged units (or returns) were added for a SKU: when, how many, the screen (flow), record, direction and the scan session (opens its details in a new tab). */
export const WarehouseEntriesModal: React.FC<WarehouseEntriesModalProps> = ({ target, onClose, onSwitch }) => {
  const { data = [], isLoading, isError } = useGetWarehouseEntriesQuery({ productId: target?.product.id ?? 0, kind: target?.kind ?? 'damaged' }, { skip: !target })
  const kind = target?.kind ?? 'damaged'
  const label = kind === 'units' ? 'Units' : kind === 'return' ? 'Returns' : 'Damaged'
  const what = kind === 'units' ? 'in our warehouse' : kind === 'return' ? 'as returns' : 'as damaged'
  const units = data.reduce((sum, entry) => sum + entry.units, 0)

  return (
    <Modal isOpen={target !== null} onClose={onClose} title={target ? `${label} · ${target.product.sku}` : label} size="2xl">
      {target && (
        <p className="mb-3 text-sm text-text-muted">
          {target.product.name} · {units.toLocaleString('en-CA')} {units === 1 ? 'unit' : 'units'} {kind === 'units' ? 'net' : 'added'} {what}, newest first.
        </p>
      )}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : isError ? (
        <p className="py-6 text-center text-danger-600">Could not load the entries.</p>
      ) : data.length === 0 ? (
        <p className="py-6 text-center text-text-muted">{kind === 'units' ? 'No units have moved in or out of the warehouse for this SKU.' : `Nothing was scanned in ${kind === 'return' ? 'as a return' : 'as damaged'} for this SKU.`}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-secondary-50 text-xs uppercase tracking-wide text-text-muted">
              <tr>
                {['Added', 'Units', 'Screen', 'Record', 'Direction', 'Session', 'Linked', 'By'].map((heading) => (
                  <th key={heading} className="whitespace-nowrap px-3 py-2 text-center font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((entry) => (
                <tr key={entry.id} className="border-t border-border text-center">
                  <td className="whitespace-nowrap px-3 py-2">{WHEN(entry.at)}</td>
                  <td className={`px-3 py-2 font-semibold tabular-nums ${entry.units < 0 ? 'text-danger-600' : ''}`}>
                    {kind === 'units' && entry.units > 0 ? '+' : ''}
                    {entry.units.toLocaleString('en-CA')}
                  </td>
                  <td className="min-w-[10rem] whitespace-normal break-words px-3 py-2">{entry.screen}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                    {entry.ref && entry.record ? (
                      <NewTabLink href={recordHref(entry.record)} title={`Open this ${entry.record.type} in a new tab`}>
                        {entry.ref}
                      </NewTabLink>
                    ) : (
                      entry.ref ?? '—'
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{entry.direction === 'IN' ? 'Inventory In' : entry.direction === 'OUT' ? 'Inventory Out' : '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {entry.sessionId !== null && entry.session ? (
                      <NewTabLink href={`/dashboard/barcode/session/${entry.sessionId}`} title="Open this scan session in a new tab" className="font-mono text-xs font-semibold">
                        {entry.session}
                      </NewTabLink>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {entry.linked ? (
                      <button
                        type="button"
                        onClick={() => onSwitch?.(entry.linked === 'return' ? 'return' : 'damaged')}
                        title={entry.linked === 'return' ? 'This damaged unit came back as a return. Show the return entry' : 'This return came back damaged. Show its damaged entry'}
                        className="rounded-full bg-warning-100 px-2 py-0.5 text-xs font-semibold text-warning-700 hover:underline"
                      >
                        {entry.linked === 'return' ? 'From return' : 'Also damaged'}
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">{entry.by ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}
