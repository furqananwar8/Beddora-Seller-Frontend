'use client'

import React from 'react'
import Link from 'next/link'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { FormSection as Section } from '@/features/finance/shared/FormSection'
import { useGetPoPackagingListsQuery, type PoPackagingListSummary } from '@/services/api/procurement.api'
import { CONTAINER_ROUTES } from '../containers/routes'
import { containerLabel } from './poMeta'
import { productLabel } from './ProductPicker'

const qty = (value: number) => value.toLocaleString('en-CA')
const HEAD = 'px-3 py-1.5 text-right text-xs font-semibold uppercase tracking-wide text-text-muted'
const CELL = 'px-3 py-1.5 text-right tabular-nums'

/**
 * The packaging lists carrying a purchase order's units, per SKU: the drafted units and, once the list is converted
 * to final, the final units beside them. Shown with an invoice, which is raised against the PO whether or not a list exists yet.
 */
export const PoPackagingListsSection: React.FC<{ lists: PoPackagingListSummary[]; poNo: string }> = ({ lists, poNo }) => (
  <Section title="Packaging lists" note={`packed from ${poNo}`}>
    {lists.length === 0 ? (
      <p className="text-sm text-text-muted">No packaging list for this purchase order yet. An invoice can be raised before or after one is made.</p>
    ) : (
      <div className="flex flex-col gap-4">
        {lists.map((list) => (
          <div key={list.id} className="overflow-hidden rounded-lg border border-border">
            <div className="flex flex-wrap items-center gap-2 bg-secondary-50 px-3 py-2">
              <Link href={`/dashboard/procurement/packaging-lists/${list.id}`} className="font-mono text-sm font-semibold text-primary-600 hover:underline">
                {list.plNo}
              </Link>
              <StatusBadge label={list.kind === 'FINAL' ? 'FINAL' : 'TENTATIVE'} tone={list.kind === 'FINAL' ? 'success' : 'warning'} />
              {list.container ? (
                <Link href={CONTAINER_ROUTES.detail(list.container.id)} className="text-xs font-semibold text-primary-600 underline-offset-2 hover:underline">
                  {containerLabel(list.container)}
                </Link>
              ) : (
                <span className="text-xs text-text-muted">No container yet</span>
              )}
              <span className="ml-auto text-xs text-text-muted">
                {qty(list.totals.units)} units{list.totals.finalUnits !== null && ` · ${qty(list.totals.finalUnits)} final`} · {qty(list.totals.cartons)} cartons · {list.totals.cbm.toFixed(2)} CBM
              </span>
            </div>
            <div className="ds-scroll-x">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className={`${HEAD} text-left`}>SKU / product</th>
                    <th className={HEAD}>Units</th>
                    <th className={HEAD}>Final units</th>
                    <th className={HEAD}>Cartons</th>
                    <th className={HEAD}>CBM</th>
                  </tr>
                </thead>
                <tbody>
                  {list.lines.map((line) => (
                    <tr key={line.product.id} className="border-t border-border">
                      <td className="px-3 py-1.5 text-left">
                        <span className="font-mono text-xs font-semibold text-text-primary">{line.product.ref}</span>
                        <span className="ml-2 text-xs text-text-secondary">{productLabel(line.product)}</span>
                      </td>
                      <td className={CELL}>{qty(line.units)}</td>
                      <td className={CELL}>{line.finalUnits === null ? <span className="text-text-muted">—</span> : qty(line.finalUnits)}</td>
                      <td className={CELL}>{qty(line.cartons)}</td>
                      <td className={CELL}>{line.cbm.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    )}
  </Section>
)

/** The same section for the create-invoice flow, which only has the PO's id. */
export const PoPackagingListsPanel: React.FC<{ purchaseOrderId: number; poNo: string }> = ({ purchaseOrderId, poNo }) => {
  const { data } = useGetPoPackagingListsQuery(purchaseOrderId)
  return data ? <PoPackagingListsSection lists={data} poNo={poNo} /> : null
}
