'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { Button } from '@/design-system/buttons'
import { useGetPartnersQuery, type PartnerType } from '@/services/api/finance.api'
import { useDebounce } from '@/utils/debounce'
import { ScreenSearch } from '../shared/ScreenSearch'
import { useFinanceCapabilities } from '../shared/useFinanceCapabilities'
import { PartnerTable } from './PartnerTable'
import { usePartnerRemoval } from './usePartnerRemoval'
import { useRowSelection } from '@/hooks/useRowSelection'

const PAGE_SIZE = 10
const BASE = '/dashboard/finance/partner-profile'

type TypeFilter = 'ALL' | PartnerType

export const PartnerListScreen: React.FC = () => {
  const router = useRouter()
  const { canWritePartners } = useFinanceCapabilities()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [type, setType] = useState<TypeFilter>('ALL')
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching, isError } = useGetPartnersQuery({
    search: debouncedSearch,
    type: type === 'ALL' ? undefined : type,
    page,
    limit: PAGE_SIZE,
  })
  const rows = data?.data ?? []
  const selection = useRowSelection(rows.map((row) => row.id))
  const removal = usePartnerRemoval(() => selection.clear())

  return (
    <Container size="full" className="py-4 sm:py-8">
      <ScreenSearch
        placeholder="Search name, contact, email or city..."
        value={search}
        onChange={(value) => {
          setSearch(value)
          setPage(1)
        }}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-text-primary sm:text-xl">All partners ({data?.totalRecords ?? 0})</h1>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedToggle<TypeFilter>
            ariaLabel="Filter by type"
            value={type}
            onChange={(value) => {
              setType(value)
              setPage(1)
            }}
            options={[
              { value: 'ALL', label: 'All' },
              { value: 'VENDOR', label: 'Vendor' },
              { value: 'SUPPLIER', label: 'Supplier' },
            ]}
          />
          {canWritePartners && selection.count > 0 && (
            <Button variant="danger" onClick={() => removal.askMany(selection.keys)}>
              Delete selected ({selection.count})
            </Button>
          )}
          {canWritePartners && <Button onClick={() => router.push(`${BASE}/new`)}>+ New partner</Button>}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border shadow-sm">
        <PartnerTable
          rows={rows}
          isLoading={isLoading}
          isFetching={isFetching}
          isError={isError}
          onOpen={(id) => router.push(`${BASE}/${id}`)}
          selection={canWritePartners ? selection : undefined}
          onDelete={canWritePartners ? removal.askOne : undefined}
        />
        {data && (
          <PaginationFooter
            page={data.page}
            pageSize={data.limit}
            totalItems={data.totalRecords}
            totalPages={data.totalPages}
            onPageChange={setPage}
            itemLabel="partners"
          />
        )}
      </div>
      {removal.dialog}
    </Container>
  )
}
