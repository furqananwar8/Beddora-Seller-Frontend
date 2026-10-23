'use client'

import React from 'react'
import Link from 'next/link'
import { Spinner } from '@/design-system/loaders'
import { useGetContainerCostDetailQuery } from '@/services/api/procurement.api'
import { CostTable } from '../cost-analysis/CostTable'
import { landedCostColumns, landedCostRows } from '../cost-analysis/landedCostColumns'
import { CONTAINER_ROUTES } from '../routes'
import { Panel, PanelEmpty } from './Panel'

/** The container's landed cost per SKU, read off its cost analysis. */
export const LandedCostPanel: React.FC<{ containerId: number }> = ({ containerId }) => {
  const { data, isLoading, isError } = useGetContainerCostDetailQuery(containerId)
  const rows = data ? landedCostRows(data) : []
  return (
    <Panel
      title="Landed cost"
      count={data ? rows.length : undefined}
      action={
        <Link href={CONTAINER_ROUTES.costAnalysis} className="text-xs font-semibold text-primary-600 underline-offset-2 hover:underline">
          Cost analysis
        </Link>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : isError || !data ? (
        <PanelEmpty>Could not load this container&apos;s landed cost.</PanelEmpty>
      ) : rows.length === 0 ? (
        <PanelEmpty>No packaging list in this container yet, so there is nothing to cost.</PanelEmpty>
      ) : (
        <CostTable columns={landedCostColumns(data.currency)} rows={rows} rowKey={(row) => `${row.purchaseOrderId}:${row.productId}`} totals={data.totals} />
      )}
    </Panel>
  )
}
