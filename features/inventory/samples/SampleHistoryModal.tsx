'use client'

import React from 'react'
import { Modal } from '@/design-system/modals'
import { Spinner } from '@/design-system/loaders'
import { useGetProductSamplesQuery } from '@/services/api/samples.api'
import { sampleAmount, sampleDay } from './sampleMeta'

interface SampleHistoryModalProps {
  /** The SKU whose samples are shown; null keeps the modal closed. */
  product: { id: number; sku: string; name: string } | null
  onClose: () => void
}

/** Every sample of a SKU in its Samples section: the PO, what was paid and when, and when it was added. */
export const SampleHistoryModal: React.FC<SampleHistoryModalProps> = ({ product, onClose }) => {
  const { data = [], isLoading, isError } = useGetProductSamplesQuery(product?.id ?? 0, { skip: !product })
  const units = data.reduce((sum, sample) => sum + sample.units, 0)

  return (
    <Modal isOpen={product !== null} onClose={onClose} title={product ? `Samples · ${product.sku}` : 'Samples'} size="lg">
      {product && <p className="mb-3 text-sm text-text-muted">{product.name} · {units.toLocaleString('en-CA')} {units === 1 ? 'unit' : 'units'} received as samples. They are not part of stock.</p>}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : isError ? (
        <p className="py-6 text-center text-danger-600">Could not load the samples.</p>
      ) : data.length === 0 ? (
        <p className="py-6 text-center text-text-muted">No sample of this SKU has been added yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-secondary-50 text-xs uppercase tracking-wide text-text-muted">
              <tr>
                {['PO', 'Units', 'Type', 'Payment made', 'Request date', 'Added to inventory'].map((label) => (
                  <th key={label} className="whitespace-nowrap px-3 py-2 text-center font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((sample) => (
                <tr key={sample.id} className="border-t border-border text-center">
                  <td className="px-3 py-2 font-semibold">{sample.purchaseOrder?.poNo ?? "Standalone"}</td>
                  <td className="px-3 py-2 tabular-nums">{sample.units.toLocaleString('en-CA')}</td>
                  <td className="whitespace-nowrap px-3 py-2">{sample.isFree ? 'Free' : `Chargeable · ${sampleAmount(sample.currency, sample.amount, false)}`}</td>
                  <td className="whitespace-nowrap px-3 py-2">{sampleDay(sample.paidAt)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{sampleDay(sample.requestedAt)}</td>
                  <td className="whitespace-nowrap px-3 py-2">{sampleDay(sample.inventoryAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}
