'use client'

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { TreeTable, type TreeColumn } from '@/components/tree-table/TreeTable'
import { currentMonth, monthLabel } from '@/components/month-picker/MonthPicker'
import { Button } from '@/design-system/buttons'
import { formatCurrencyAmount } from '@/features/finance/shared/format'
import { useAppAbility } from '@/hooks/useAppAbility'
import { formatCbmPerPiece } from '@/utils/cartonMetrics'
import { useGetSkuLandedQuery, type InboundChannel, type LandedAmounts, type OpexCountry, type SkuLandedRow } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { OpexMappingModal } from './OpexMappingModal'
import { SkuLandedTimeline } from './SkuLandedTimeline'
import { WarehouseOverheadModal } from './WarehouseOverheadModal'

const PAGE_SIZE = 25
const muted = <span className="text-text-muted">—</span>
const money = (currency: string, value: number) => <span className="whitespace-nowrap tabular-nums">{formatCurrencyAmount(currency, value)}</span>
const landed = (currency: keyof LandedAmounts) => (row: SkuLandedRow) => (row.landedCost[currency] > 0 ? money(currency, row.landedCost[currency]) : muted)

/** Shipment cost columns, in screen order, under one "Shipment" heading. */
const SHIPMENT_COLUMNS: Array<{ channel: InboundChannel; header: string }> = [
  { channel: 'WALMART_WFS', header: 'WFS' },
  { channel: 'AMAZON_FBA', header: 'FBA' },
]

/** Warehouse overhead per unit, per country, under one "Warehouse overhead" heading. */
const OVERHEAD_COLUMNS: Array<{ country: OpexCountry; header: string }> = [
  { country: 'CA', header: 'Canada' },
  { country: 'US', header: 'USA' },
]

const columnsFor = (shipmentCurrency: string, opexCurrency: string): TreeColumn<SkuLandedRow>[] => [
  {
    key: 'sku',
    header: 'SKU',
    className: 'min-w-[220px] text-left',
    render: (row) => (
      <div>
        <div className="font-semibold text-text-primary">{row.product.sku}</div>
        <div className="text-xs text-text-muted">
          {row.product.name} · {row.containerCount} container{row.containerCount === 1 ? '' : 's'}
          {row.cbmPerPiece !== null && ` · ${formatCbmPerPiece(row.cbmPerPiece)} CBM / piece`}
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
  ...OVERHEAD_COLUMNS.map(({ country, header }): TreeColumn<SkuLandedRow> => ({
    key: `overhead-${country}`,
    header,
    group: 'Warehouse overhead',
    render: (row) => {
      const cost = row.warehouseOverhead[country]
      return cost === null ? muted : money(opexCurrency, cost)
    },
  })),
]

/** Per SKU: its landed cost from containers in transit or delivered, and its shipment cost; opening one shows its timeline. */
export const SkuLandedScreen: React.FC = () => {
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { data, isLoading, isFetching, isError } = useGetSkuLandedQuery({ page, limit: PAGE_SIZE, search: search.trim() })
  const month = currentMonth()
  const opex = data?.opex
  const canWrite = useAppAbility().can('write', 'containers:sku-landed')
  const [dialog, setDialog] = useState<'overhead' | 'mapping' | null>(null)

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
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" title="Warehouse overhead plus 3PL payments this month">
            Opex · {monthLabel(month)} <span className="ml-2 font-semibold tabular-nums text-text-primary">{opex ? formatCurrencyAmount(opex.currency, opex.total) : '—'}</span>
            {opex && (
              <span className="ml-3 text-xs text-text-muted">
                {OVERHEAD_COLUMNS.map(({ country, header }) => `${header} ${opex.countries[country].ratePerCbm === null ? '—' : formatCurrencyAmount(opex.currency, opex.countries[country].ratePerCbm!)} / CBM`).join(' · ')}
              </span>
            )}
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => setDialog('overhead')}>
            Warehouse overhead
          </Button>
          {canWrite && (
            <Button type="button" size="sm" variant="outline" onClick={() => setDialog('mapping')}>
              Map expense columns
            </Button>
          )}
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
            columns={columnsFor(data?.shipmentCurrency ?? 'CAD', data?.opex.currency ?? 'CAD')}
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

      <WarehouseOverheadModal open={dialog === 'overhead'} onClose={() => setDialog(null)} canEdit={canWrite} />
      <OpexMappingModal open={dialog === 'mapping'} onClose={() => setDialog(null)} />
    </Container>
  )
}
