'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { RowActionsMenu, type RowActionItem } from '@/components/row-actions-menu/RowActionsMenu'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Spinner } from '@/design-system/loaders'
import { CHANNEL_LABEL, CREATE_HREF, shortDateTime } from '../shippingMeta'
import type { ShipmentDraftSummary } from '../types'

interface DraftsTableProps {
  rows: ShipmentDraftSummary[]
  isLoading: boolean
  isError: boolean
  canWrite: boolean
  onDelete: (row: ShipmentDraftSummary) => void
}

const HEAD = 'px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted'
const CELL = 'px-4 py-3 align-top text-sm'

export const draftHref = (id: number) => `${CREATE_HREF}?draft=${id}`

/** Manual shipments saved unfinished. Row click resumes one in Create shipment. */
export const DraftsTable: React.FC<DraftsTableProps> = ({ rows, isLoading, isError, canWrite, onDelete }) => {
  const router = useRouter()
  if (isLoading)
    return (
      <div className="flex justify-center p-10">
        <Spinner size="sm" />
      </div>
    )
  if (isError) return <p className="p-8 text-center text-sm text-danger-600">Could not load the drafts.</p>
  if (rows.length === 0) return <p className="p-8 text-center text-sm text-text-muted">No drafts. Leave Create shipment unfinished and choose Save as draft to find it here.</p>

  const actions = (row: ShipmentDraftSummary): RowActionItem[] => [
    ...(canWrite ? [{ key: 'resume', label: 'Resume', onSelect: () => router.push(draftHref(row.id)) }] : []),
    ...(canWrite ? [{ key: 'delete', label: 'Delete draft', tone: 'danger' as const, onSelect: () => onDelete(row) }] : []),
  ]

  return (
    <table className="w-full">
      <thead className="sticky top-0 z-10 bg-surface">
        <tr className="border-b border-border">
          <th className={HEAD}>Draft</th>
          <th className={HEAD}>Last saved</th>
          <th className={HEAD}>Source</th>
          <th className={HEAD}>Recipient</th>
          <th className={HEAD}>Saved by</th>
          <th className={HEAD}>Status</th>
          <th className={HEAD} aria-label="Actions" />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} onClick={() => canWrite && router.push(draftHref(row.id))} className="cursor-pointer border-b border-border last:border-0 hover:bg-secondary-50">
            <td className={CELL}>
              <span className="font-semibold text-text-primary">{row.draftNo}</span>
              <span className="block text-xs text-text-muted">{row.reference ?? '—'}</span>
            </td>
            <td className={`${CELL} whitespace-nowrap`}>{shortDateTime(row.updatedAt)}</td>
            <td className={CELL}>
              <StatusBadge label="Manual" tone="neutral" />
              {row.channel && (
                <span className="block text-xs text-text-muted">
                  {CHANNEL_LABEL[row.channel.channel]}
                  {row.channel.market ? ` · ${row.channel.market.toUpperCase()}` : ''}
                </span>
              )}
            </td>
            <td className={CELL}>
              {row.recipient.name ?? <span className="text-text-muted">Not entered yet</span>}
              {(row.recipient.city || row.recipient.country) && (
                <span className="block text-xs text-text-muted">{[row.recipient.city, row.recipient.province, row.recipient.country].filter(Boolean).join(', ')}</span>
              )}
            </td>
            <td className={CELL}>{row.createdBy?.name ?? '—'}</td>
            <td className={CELL}>
              <StatusBadge label="Draft" tone="warning" />
            </td>
            <td className={`${CELL} text-right`} onClick={(event) => event.stopPropagation()}>
              <RowActionsMenu label={row.draftNo} items={actions(row)} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
