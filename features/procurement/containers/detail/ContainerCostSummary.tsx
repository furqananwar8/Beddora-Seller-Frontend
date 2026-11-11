'use client'

import React from 'react'
import Link from 'next/link'
import { Spinner } from '@/design-system/loaders'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useGetContainerCostDetailQuery, type ContainerDetail } from '@/services/api/procurement.api'
import { CostTable } from '../cost-analysis/CostTable'
import { landedCostColumns, landedCostRows } from '../cost-analysis/landedCostColumns'
import { CONTAINER_ROUTES } from '../routes'

/**
 * The top of a container's details: a row per SKU in it with its units, CBM, FOB amount, allocated expenses and
 * final landed amount, the container's total at the bottom; the full breakdown is on the Cost Analysis screen. Read
 * off the container's cost analysis, so it is only offered to who may open that screen.
 */
export const ContainerCostSummary: React.FC<{ container: Pick<ContainerDetail, 'id'> }> = ({ container }) => {
  const allowed = useAppAbility().can('read', 'containers:cost-analysis')
  const { data, isLoading, isError } = useGetContainerCostDetailQuery(container.id, { skip: !allowed })
  if (!allowed || isError) return null
  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    )
  }
  const rows = data ? landedCostRows(data) : []
  if (!data || rows.length === 0) return null

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <p className="text-sm text-text-muted">
          Showing {rows.length} {rows.length === 1 ? 'SKU' : 'SKUs'} in this container
        </p>
        <Link href={CONTAINER_ROUTES.costAnalysis} className="text-xs font-semibold text-primary-600 underline-offset-2 hover:underline">
          Full cost analysis
        </Link>
      </header>
      <CostTable columns={landedCostColumns(data.currency)} rows={rows} rowKey={(row) => `${row.purchaseOrderId}:${row.productId}`} totals={data.totals} />
    </section>
  )
}
