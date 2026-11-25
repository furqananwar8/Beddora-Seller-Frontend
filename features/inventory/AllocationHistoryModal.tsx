'use client'

import React from 'react'
import { Spinner } from '@/design-system/loaders'
import { Modal } from '@/design-system/modals'
import { useGetAllocationHistoryQuery } from '@/services/api/inventoryPlanner.api'
import { ADJUSTMENT_ROWS } from './adjustments/buckets'

const LABEL = new Map<string | null, string>([...ADJUSTMENT_ROWS.map(({ bucket, label }) => [bucket, label] as const), [null, 'Outside the warehouse']])
const WHEN = (iso: string) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })

/** Every allocation of a SKU: when, how many units moved from which bucket to which (FBA, FBM, buffer ...), and who did it. */
export const AllocationHistoryModal: React.FC<{ target: { id: string; sku: string } | null; onClose: () => void }> = ({ target, onClose }) => {
  const { data = [], isLoading, isError } = useGetAllocationHistoryQuery(target?.id ?? '', { skip: !target })
  return (
    <Modal isOpen={target !== null} onClose={onClose} title={target ? `Allocation history · ${target.sku}` : 'Allocation history'} size="2xl">
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : isError ? (
        <p className="py-6 text-center text-danger-600">Could not load the history.</p>
      ) : data.length === 0 ? (
        <p className="py-6 text-center text-text-muted">This SKU has not been allocated yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-secondary-50 text-xs uppercase tracking-wide text-text-muted">
              <tr>
                {['When', 'Units', 'From', 'To', 'By'].map((heading) => (
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
                  <td className="px-3 py-2">{LABEL.get(entry.from) ?? entry.from}</td>
                  <td className="px-3 py-2">{LABEL.get(entry.to) ?? entry.to}</td>
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
