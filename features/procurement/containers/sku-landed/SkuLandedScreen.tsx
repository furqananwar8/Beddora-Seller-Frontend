'use client'

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { TreeTable, type TreeColumn } from '@/components/tree-table/TreeTable'
import { formatCurrencyAmount } from '@/features/finance/shared/format'
import { useGetSkuLandedQuery, type InboundChannel, type LandedAmounts, type SkuLandedRow } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { SkuLandedTimeline } from './SkuLandedTimeline'

const PAGE_SIZE = 25
const muted = <span className="text-text-muted">—</span>
const money = (currency: string, value: number) => <span className="whitespace-nowrap tabular-nums">{formatCurrencyAmount(currency, value)}</span>
const landed = (currency: keyof LandedAmounts) => (row: SkuLandedRow) => (row.landedCost[currency] > 0 ? money(currency, row.landedCost[currency]) : muted)

/** Shipment cost columns, in screen order, under one "Shipment" heading. */
const SHIPMENT_COLUMNS: Array<{ channel: InboundChannel; header: string }> = [
  { channel: 'WALMART_WFS', header: 'WFS' },
  { channel: 'AMAZON_FBA', header: 'FBA' },
]

const columnsFor = (shipmentCurrency: string): TreeColumn<SkuLandedRow>[] => [
  {
    key: 'sku',
    header: 'SKU',
    className: 'min-w-[220px] text-left',
    render: (row) => (
      <div>
        <div className="font-semibold text-text-primary">{row.product.sku}</div>
        <div className="text-xs text-text-muted">
          {row.product.name} · {row.containerCount} container{row.containerCount === 1 ? '' : 's'}
        </div>
      </div>
    ),
  },
  { key: 'landedCad', header: 'Landed Cost (CAD)', render: landed('CAD') },
  { key: 'landedUsd', header: 'Landed Cost (USA)', render: landed('USD') },
  ...SHIPMENT_COLUMNS.map(({ channel, header }): TreeColumn<SkuLandedRow> => ({
    key: `shipment-${channel}`,
    header,
    group: 'Shipment',
    render: (row) => {
      const cost = row.shipmentCost[channel]
      return cost === null ? muted : money(shipmentCurrency, cost)
    },
  })),
]

/** Per SKU: its landed cost from containers in transit or delivered, and its shipment cost; opening one shows its timeline. */
export const SkuLandedScreen: React.FC = () => {
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { data, isLoading, isFetching, isError } = useGetSkuLandedQuery({ page, limit: PAGE_SIZE, search: search.trim() })

  const apply = () => {
    setSearch(draft)
    setPage(1)
  }

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">SKU Landed</h1>
          <p className="text-sm text-text-muted">Landed cost per unit from every container in transit or delivered, and the shipment cost to Amazon</p>
        </div>
        <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
          Opex <span className="ml-2 font-semibold tabular-nums text-text-primary">{((data?.opexRate ?? 0) * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && apply()}
          onBlur={apply}
          placeholder="Search SKU, product name or UPC"
          aria-label="Search SKUs"
          className="ds-input ds-input-default w-full max-w-md rounded-lg"
        />
      </div>

      <div className={cn('overflow-hidden rounded-lg border border-border bg-surface shadow-sm', isFetching && 'opacity-70 transition-opacity')}>
        <div className="max-h-[calc(100vh-300px)] overflow-auto">
          <TreeTable<SkuLandedRow>
            columns={columnsFor(data?.shipmentCurrency ?? 'CAD')}
            rows={data?.data ?? []}
            getKey={(row) => row.product.id}
            getChildren={() => []}
            renderDetail={(row) => <SkuLandedTimeline productId={row.product.id} />}
            expandLabel="timeline"
            isLoading={isLoading}
            isError={isError}
            emptyText={search ? 'No SKU matches.' : 'No SKUs yet.'}
            errorText="Could not load the SKU landed costs."
          />
        </div>
        {data && <PaginationFooter page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="SKUs" />}
      </div>
    </Container>
  )
}
