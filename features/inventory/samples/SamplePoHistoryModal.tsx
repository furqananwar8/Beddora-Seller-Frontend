'use client'

import Link from 'next/link'
import React from 'react'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Modal } from '@/design-system/modals'
import { DocumentChips } from '@/features/finance/shared/DocumentChips'
import { sampleDocumentPath, type SampleGroup } from '@/services/api/samples.api'
import { SAMPLE_STATUS_META, sampleAmount, sampleDay } from './sampleMeta'

const HEAD = 'px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-text-muted'
const CELL = 'px-3 py-2 text-center align-middle'

/**
 * Every sample of one SKU from one supplier, newest first: the PO each came with (or none) and the date it was added,
 * so a SKU that came with several POs can be traced back to each of them.
 */
export const SamplePoHistoryModal: React.FC<{ group: SampleGroup | null; onClose: () => void }> = ({ group, onClose }) => (
  <Modal isOpen={group !== null} onClose={onClose} size="xl" title={group ? `Sample history · ${group.product.sku ?? group.product.name} · ${group.supplier.name}` : 'Sample history'}>
    {group && (
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-secondary-50">
            <tr>
              <th className={HEAD}>Added on</th>
              <th className={HEAD}>PO</th>
              <th className={HEAD}>Units</th>
              <th className={HEAD}>Type</th>
              <th className={HEAD}>Amount</th>
              <th className={HEAD}>Payment</th>
              <th className={HEAD}>Documents</th>
            </tr>
          </thead>
          <tbody>
            {group.entries.map((entry) => {
              const status = SAMPLE_STATUS_META[entry.status]
              return (
                <tr key={entry.id} className="border-t border-border">
                  <td className={`${CELL} whitespace-nowrap`}>{sampleDay(entry.createdAt)}</td>
                  <td className={CELL}>
                    {entry.purchaseOrder ? (
                      <Link href={`/dashboard/procurement/purchase-orders/${entry.purchaseOrder.id}`} className="font-medium text-primary-600 hover:underline">
                        {entry.purchaseOrder.poNo}
                      </Link>
                    ) : (
                      <span className="text-text-muted">Standalone</span>
                    )}
                  </td>
                  <td className={`${CELL} tabular-nums`}>{entry.units.toLocaleString('en-CA')}</td>
                  <td className={CELL}>{entry.isFree ? 'Free' : 'Chargeable'}</td>
                  <td className={`${CELL} whitespace-nowrap tabular-nums`}>{sampleAmount(entry.currency, entry.amount, entry.isFree)}</td>
                  <td className={CELL}>
                    {entry.paidWithPo && entry.purchaseOrder ? (
                      <span className="text-xs text-text-muted">Paid with {entry.purchaseOrder.poNo}</span>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <StatusBadge label={status.label} tone={status.tone} />
                        {entry.paidAt && <span className="text-xs text-text-muted">Paid {sampleDay(entry.paidAt)}</span>}
                      </div>
                    )}
                  </td>
                  <td className={CELL}>
                    <DocumentChips className="justify-center" documents={entry.documents} emptyText="—" documentPath={(doc) => sampleDocumentPath(entry.id, doc.id)} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )}
  </Modal>
)
