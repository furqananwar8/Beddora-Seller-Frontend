'use client'

import React, { useState } from 'react'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableStatusRow } from '@/design-system/tables'
import { DocumentChips } from '@/features/finance/shared/DocumentChips'
import { sampleDocumentPath, type SampleGroup, type SampleItem, type SampleStatus } from '@/services/api/samples.api'
import { SamplePoHistoryModal } from './SamplePoHistoryModal'
import { SAMPLE_STATUS_META, sampleAmount } from './sampleMeta'

const CELL = 'text-center align-middle'
const COLUMNS = ['SKU', 'Supplier', 'POs', 'Units', 'Status', 'To pay', 'Documents']

/** What still needs paying for these samples, per currency: unpaid ones that are not paid with their PO. */
const dueOf = (entries: SampleItem[]): Array<{ currency: string; amount: number }> => {
  const totals = new Map<string, number>()
  for (const entry of entries) if (entry.status === 'UNPAID' && !entry.paidWithPo) totals.set(entry.currency, Math.round(((totals.get(entry.currency) ?? 0) + entry.amount) * 100) / 100)
  return [...totals].map(([currency, amount]) => ({ currency, amount }))
}

/**
 * One status for the whole row, the most pressing first (unpaid, then requested, then paid); the mix behind it is in the
 * history. A row with nothing to pay says so: free samples, or samples paid with their PO.
 */
const statusOf = (group: SampleGroup): { label: string; tone: (typeof SAMPLE_STATUS_META)[SampleStatus]['tone'] } => {
  for (const status of ['UNPAID', 'REQUESTED', 'PAID'] as const) {
    if (group.statuses.some((item) => item.status === status)) return SAMPLE_STATUS_META[status]
  }
  return group.withPoCount > 0 ? { label: 'Paid with PO', tone: 'success' } : SAMPLE_STATUS_META.FREE
}

interface SamplesTableProps {
  rows: SampleGroup[] | undefined
  isLoading: boolean
  isError: boolean
}

/**
 * One row per SKU and supplier. The POs column counts the POs those samples came with; clicking it lists every sample
 * entry with the date it was added. The same SKU from another supplier is its own row. Information only: samples never
 * change stock.
 */
export const SamplesTable: React.FC<SamplesTableProps> = ({ rows, isLoading, isError }) => {
  const [viewing, setViewing] = useState<SampleGroup | null>(null)
  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border shadow-sm">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              {COLUMNS.map((label) => (
                <TableHead key={label} className="whitespace-nowrap text-center">
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableStatusRow colSpan={COLUMNS.length} loading />
            ) : isError ? (
              <TableStatusRow colSpan={COLUMNS.length} tone="danger">
                Could not load the samples.
              </TableStatusRow>
            ) : !rows || rows.length === 0 ? (
              <TableStatusRow colSpan={COLUMNS.length}>No sample matches these filters.</TableStatusRow>
            ) : (
              rows.map((group) => (
                <TableRow key={group.key}>
                  <TableCell className={CELL}>
                    <div className="font-semibold text-text-primary">{group.product.sku ?? '—'}</div>
                    <div className="text-xs text-text-muted">{group.product.name}</div>
                  </TableCell>
                  <TableCell className={CELL}>{group.supplier.name}</TableCell>
                  <TableCell className={CELL}>
                    <button
                      type="button"
                      onClick={() => setViewing(group)}
                      aria-label={`Show the ${group.entries.length} sample ${group.entries.length === 1 ? 'entry' : 'entries'} of ${group.product.sku ?? group.product.name} from ${group.supplier.name}`}
                      className="rounded-md px-2 py-0.5 font-semibold tabular-nums text-primary-600 underline-offset-2 hover:bg-primary-50 hover:underline"
                    >
                      {group.poCount}
                    </button>
                    {group.standaloneCount > 0 && <div className="text-xs text-text-muted">+ {group.standaloneCount} standalone</div>}
                  </TableCell>
                  <TableCell className={`${CELL} tabular-nums`}>{group.units.toLocaleString('en-CA')}</TableCell>
                  <TableCell className={CELL}>
                    <StatusBadge label={statusOf(group).label} tone={statusOf(group).tone} />
                  </TableCell>
                  <TableCell className={`${CELL} whitespace-nowrap tabular-nums`}>
                    {dueOf(group.entries).length === 0 ? <span className="text-text-muted">—</span> : dueOf(group.entries).map((total) => <div key={total.currency}>{sampleAmount(total.currency, total.amount, false)}</div>)}
                  </TableCell>
                  <TableCell className={CELL}>
                    {group.documents.length === 0 ? (
                      <span className="text-text-muted">—</span>
                    ) : group.documents.length === 1 ? (
                      <DocumentChips className="justify-center" documents={group.documents} documentPath={(doc) => sampleDocumentPath(group.entries.find((entry) => entry.documents.some((item) => item.id === doc.id))?.id ?? 0, doc.id)} />
                    ) : (
                      <button type="button" onClick={() => setViewing(group)} className="rounded-md px-2 py-0.5 text-xs font-medium text-primary-600 hover:bg-primary-50 hover:underline">
                        {group.documents.length} files
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <SamplePoHistoryModal group={viewing} onClose={() => setViewing(null)} />
    </>
  )
}
