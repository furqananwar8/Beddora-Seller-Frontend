'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { TreeTable, type TreeColumn } from '@/components/tree-table/TreeTable'
import { Button } from '@/design-system/buttons'
import { useGetCostCentersQuery, type CostCenterRoot } from '@/services/api/costCenters.api'
import { useDebounce } from '@/utils/debounce'
import { cn } from '@/utils/cn'
import { ScreenSearch } from '../shared/ScreenSearch'
import { useFinanceCapabilities } from '../shared/useFinanceCapabilities'
import { BranchDetail } from './BranchDetail'
import { formatCostCenterCode } from './costCenterCode'
import { LevelBadge } from './LevelBadge'

const PAGE_SIZE = 15
export const COST_CENTER_BASE = '/dashboard/finance/cost-center'

const columns: TreeColumn<CostCenterRoot>[] = [
  {
    key: 'code',
    header: 'Account Code',
    className: 'w-56 !text-left',
    render: (row) => <span className="font-mono text-xs text-text-secondary">{formatCostCenterCode(row.code)}</span>,
  },
  { key: 'name', header: 'Name', className: '!text-left', render: (row) => <span className="font-medium text-text-primary">{row.name}</span> },
  { key: 'level', header: 'Level', className: 'w-24 !text-left', render: (row) => <LevelBadge level={row.level} /> },
]

/** L1 cost centers, each opening onto its whole hierarchy. A search opens the branches it matched. */
export const CostCenterListScreen: React.FC = () => {
  const router = useRouter()
  const { canWriteCostCenters } = useFinanceCapabilities()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching, isError } = useGetCostCentersQuery({ search: debouncedSearch, page, limit: PAGE_SIZE })

  return (
    <Container size="full" className="py-4 sm:py-8">
      <ScreenSearch
        placeholder="Search by ID (CID#A1-B2...) or name..."
        value={search}
        onChange={(value) => {
          setSearch(value)
          setPage(1)
        }}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-text-primary sm:text-xl">Cost centers ({data?.totalRecords ?? 0})</h1>
        {canWriteCostCenters && <Button onClick={() => router.push(`${COST_CENTER_BASE}/new`)}>+ Create cost center & hierarchy</Button>}
      </div>

      <div className={cn('overflow-hidden rounded-lg border border-border shadow-sm', isFetching && 'opacity-70 transition-opacity')}>
        <TreeTable
          columns={columns}
          rows={data?.data ?? []}
          getKey={(row) => row.id}
          getChildren={() => []}
          // Keyed by search so a new search re-opens what it matched
          key={debouncedSearch}
          autoExpand={(row) => row.matchIds.length > 0}
          renderDetail={(row) => <BranchDetail root={row} />}
          expandLabel="hierarchy"
          isLoading={isLoading}
          isError={isError}
          emptyText={debouncedSearch ? 'No cost center matches that search.' : 'No cost center yet.'}
          errorText="Could not load cost centers."
        />
        {data && data.totalRecords > 0 && (
          <PaginationFooter
            page={data.page}
            pageSize={data.limit}
            totalItems={data.totalRecords}
            totalPages={data.totalPages}
            onPageChange={setPage}
            itemLabel="cost centers"
          />
        )}
      </div>
    </Container>
  )
}
