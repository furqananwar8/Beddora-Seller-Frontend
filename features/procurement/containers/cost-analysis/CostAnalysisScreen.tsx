'use client'

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { TreeTable, type TreeColumn } from '@/components/tree-table/TreeTable'
import { Button } from '@/design-system/buttons'
import { formatCurrencyAmount } from '@/features/finance/shared/format'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useGetContainerCostsQuery, type ContainerCostItem } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { ContainerStatusBadge, DESTINATION_ROW_TINT } from '../../shared/poMeta'
import { ContainerCell, skuSummary } from '../list/ContainerCell'
import { ContainerFilterBar } from '../list/ContainerFilterBar'
import { useContainerListState } from '../list/useContainerListState'
import { ContainerCostDetail } from './ContainerCostDetail'
import { CostMappingModal } from './CostMappingModal'

const money = (container: ContainerCostItem, value: number) => <span className="whitespace-nowrap tabular-nums">{formatCurrencyAmount(container.currency, value)}</span>
const expensesOf = (container: ContainerCostItem) => container.totals.additionalExpense + Object.values(container.totals.costs).reduce((sum, value) => sum + value, 0)

const COLUMNS: TreeColumn<ContainerCostItem>[] = [
  {
    key: 'container',
    header: 'Container',
    className: 'min-w-[150px] text-left',
    render: (container) => <ContainerCell container={container} detail={skuSummary(container.skuCount, container.totals.units)} />,
  },
  {
    key: 'list',
    header: 'Packaging list',
    className: 'min-w-[180px] text-left',
    render: ({ packagingList }) =>
      packagingList ? (
        <div className="min-w-0">
          <p className="font-mono text-sm font-semibold text-text-primary">{packagingList.plNo}</p>
          <p className="truncate text-xs text-text-muted">{packagingList.suppliers.join(', ')}</p>
        </div>
      ) : (
        <span className="text-text-muted">—</span>
      ),
  },
  { key: 'cbm', header: 'CBM', render: (container) => <span className="font-mono text-xs">{container.totals.cbm.toFixed(2)}</span> },
  { key: 'goods', header: 'Goods (FOB)', render: (container) => money(container, container.totals.goods) },
  { key: 'expenses', header: 'Expenses', render: (container) => money(container, expensesOf(container)) },
  { key: 'total', header: 'Landed total', render: (container) => <span className="font-semibold">{money(container, container.totals.total)}</span> },
  { key: 'status', header: 'Status', render: (container) => <ContainerStatusBadge status={container.status} /> },
]

/** Every container with its landed cost; opening one shows the cost per SKU, per PO. */
export const CostAnalysisScreen: React.FC = () => {
  const list = useContainerListState()
  const { data, isLoading, isFetching, isError } = useGetContainerCostsQuery(list.params)
  const canMap = useAppAbility().can('write', 'procurement:containers')
  const [mapping, setMapping] = useState(false)

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Cost Analysis</h1>
          <p className="text-sm text-text-muted">Landed cost per SKU: invoice price and expenses, plus freight, trucking and penalties by CBM, duties and brokerage by value</p>
        </div>
        {canMap && (
          <Button type="button" size="sm" variant="outline" onClick={() => setMapping(true)}>
            Map expense columns
          </Button>
        )}
      </div>

      <ContainerFilterBar state={list} idPrefix="ca" />

      <div className={cn('overflow-hidden rounded-lg border border-border bg-surface shadow-sm', isFetching && 'opacity-70 transition-opacity')}>
        <div className="max-h-[calc(100vh-380px)] overflow-auto">
          <TreeTable<ContainerCostItem>
            columns={COLUMNS}
            rows={data?.data ?? []}
            getKey={(container) => container.id}
            getChildren={() => []}
            getRowClassName={(container) => DESTINATION_ROW_TINT[container.destination]}
            renderDetail={(container) => <ContainerCostDetail containerId={container.id} />}
            expandLabel="cost analysis"
            isLoading={isLoading}
            isError={isError}
            emptyText={list.filtered ? 'No container matches.' : 'No containers yet.'}
            errorText="Could not load the cost analysis."
          />
        </div>
        {data && <PaginationFooter page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={list.setPage} itemLabel="containers" />}
      </div>

      <CostMappingModal open={mapping} onClose={() => setMapping(false)} />
    </Container>
  )
}
