'use client'

import React from 'react'
import { Modal } from '@/design-system/modals'
import { Spinner } from '@/design-system/loaders'
import { useGetWarehouseEntriesQuery, type WarehouseEntryKind } from '@/services/api/warehouseInventory.api'

interface WarehouseEntriesModalProps {
  /** The SKU and which count was clicked; null keeps the modal closed. */
  target: { product: { id: number; sku: string; name: string }; kind: WarehouseEntryKind } | null
  onClose: () => void
}

const WHEN = (iso: string) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })

/** Every time damaged units (or returns) were added for a SKU: when, how many, the screen (flow), record, direction and the scan session (opens its details in a new tab). */
export const WarehouseEntriesModal: React.FC<WarehouseEntriesModalProps> = ({ target, onClose }) => {
  const { data = [], isLoading, isError } = useGetWarehouseEntriesQuery({ productId: target?.product.id ?? 0, kind: target?.kind ?? 'damaged' }, { skip: !target })
  const label = target?.kind === 'return' ? 'Returns' : 'Damaged'
  const units = data.reduce((sum, entry) => sum + entry.units, 0)

  return (
    <Modal isOpen={target !== null} onClose={onClose} title={target ? `${label} · ${target.product.sku}` : label} size="2xl">
      {target && (
        <p className="mb-3 text-sm text-text-muted">
          {target.product.name} · {units.toLocaleString('en-CA')} {units === 1 ? 'unit' : 'units'} added as {target.kind === 'return' ? 'returns' : 'damaged'}, newest first.
        </p>
      )}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : isError ? (
        <p className="py-6 text-center text-danger-600">Could not load the entries.</p>
      ) : data.length === 0 ? (
        <p className="py-6 text-center text-text-muted">Nothing was scanned in as {target?.kind === 'return' ? 'a return' : 'damaged'} for this SKU.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-secondary-50 text-xs uppercase tracking-wide text-text-muted">
              <tr>
                {['Added', 'Units', 'Screen', 'Record', 'Direction', 'Session', 'By'].map((heading) => (
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
                  <td className="px-3 py-2 font-semibold tabular-nums">{entry.units.toLocaleString('en-CA')}</td>
                  <td className="whitespace-nowrap px-3 py-2">{entry.screen}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{entry.ref ?? '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2">{entry.direction === 'IN' ? 'Inventory in' : entry.direction === 'OUT' ? 'Inventory out' : '—'}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {entry.sessionId !== null && entry.session ? (
                      <a
                        href={`/dashboard/barcode/session/${entry.sessionId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open this scan session in a new tab"
                        className="font-mono text-xs font-semibold text-primary-600 underline-offset-2 hover:underline"
                      >
                        {entry.session}
                      </a>
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
