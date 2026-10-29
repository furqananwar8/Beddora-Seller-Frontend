'use client'

import React, { useMemo, useState } from 'react'
import { FilterBar, FilterItem } from '@/components/filter-bar/FilterBar'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { FormField } from '@/components/form-field/FormField'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { TreeTable, type TreeColumn } from '@/components/tree-table/TreeTable'
import { monthLabel } from '@/components/month-picker/MonthPicker'
import { SingleDatePicker } from '@/components/single-date-picker/SingleDatePicker'
import { Button } from '@/design-system/buttons'
import { formatCurrencyAmount } from '@/features/finance/shared/format'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useReportExport } from '@/hooks/useReportExport'
import { formatCbmPerPiece } from '@/utils/cartonMetrics'
import { useGetSkuLandedQuery, type InboundChannel, type LandedAmounts, type OpexCountry, type SkuLandedRow } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { OpexMappingModal } from './OpexMappingModal'
import { WarehouseOverheadModal } from './WarehouseOverheadModal'
import { defaultSkuLandedFilters, todayDay } from './skuLandedFilters'

const PAGE_SIZE = 25
const muted = <span className="text-text-muted">—</span>
/** A country's warehouse cost / the CBM of its containers, read as a percentage (9,900 / 129.9 CBM = 76.21 %). */
const formatRate = (rate: number | null) => (rate === null ? '—' : `${rate.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`)
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
          {row.product.name}
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
  const defaults = useMemo(defaultSkuLandedFilters, [])
  const [page, setPage] = useState(1)
  const filters = useStagedFilters(defaults, () => setPage(1))
  const { draft, setDraft, applied, changed } = filters
  const { data, isLoading, isFetching, isError } = useGetSkuLandedQuery({ page, limit: PAGE_SIZE, search: applied.search.trim(), asOf: applied.asOf })
  const opex = data?.opex
  const canWrite = useAppAbility().can('write', 'containers:sku-landed')
  const [dialog, setDialog] = useState<'overhead' | 'mapping' | null>(null)
  const { start: startExport, isExporting } = useReportExport('sku-landed')

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">SKU Landed Cost</h1>
          <p className="text-sm text-text-muted">Landed cost per unit from every container in transit or delivered, and the shipment cost to Amazon</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm" title="Warehouse overhead plus 3PL payments this month">
            Opex · {opex ? monthLabel(opex.month) : '—'} <span className="ml-2 font-semibold tabular-nums text-text-primary">{opex ? formatCurrencyAmount(opex.currency, opex.total) : '—'}</span>
            {opex && (
              <span className="ml-3 text-xs text-text-muted">
                Opex rate / CBM: {OVERHEAD_COLUMNS.map(({ country, header }) => `${header} ${formatRate(opex.countries[country].ratePerCbm)}`).join(' · ')}
              </span>
            )}
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => setDialog('overhead')}>
            Warehouse overhead
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={isExporting} onClick={() => void startExport('xlsx', { search: applied.search.trim(), asOf: applied.asOf })}>
            {isExporting ? 'Exporting…' : 'Export Excel'}
          </Button>
          {canWrite && (
            <Button type="button" size="sm" variant="outline" onClick={() => setDialog('mapping')}>
              Map expense columns
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-primary">Filters</h2>
          <p className="text-xs text-text-muted">Costs as they stood at the end of a day: today is worked out live, earlier days come from that day's snapshot</p>
        </div>
        <FilterBar pendingCount={changed.size} activeCount={filters.activeCount} onApply={filters.apply} onReset={filters.reset}>
          <FilterItem wide>
            <FormField label="Search" htmlFor="sl-search">
              <input
                id="sl-search"
                type="search"
                value={draft.search}
                onChange={(event) => setDraft('search', event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && filters.apply()}
                placeholder="SKU, product name or UPC"
                className={cn('ds-input ds-input-default rounded-lg', changed.has('search') && 'border-primary-500 ring-1 ring-primary-500')}
              />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="As of" htmlFor="sl-as-of">
              <div className={cn('rounded-lg', changed.has('asOf') && 'ring-1 ring-primary-500')}>
                <SingleDatePicker id="sl-as-of" value={draft.asOf} onChange={(value) => setDraft('asOf', value)} max={todayDay()} />
              </div>
            </FormField>
          </FilterItem>
        </FilterBar>
      </div>

      <div className={cn('overflow-hidden rounded-lg border border-border bg-surface shadow-sm', isFetching && 'opacity-70 transition-opacity')}>
        <div className="max-h-[calc(100vh-300px)] overflow-auto">
          <TreeTable<SkuLandedRow>
            columns={columnsFor(data?.shipmentCurrency ?? 'CAD', data?.opex.currency ?? 'CAD')}
            rows={data?.data ?? []}
            getKey={(row) => row.product.id}
            isLoading={isLoading}
            isError={isError}
            emptyText={applied.search ? 'No SKU matches.' : 'No SKUs yet.'}
            errorText="Could not load the SKU landed costs."
            headerTone="primary"
          />
        </div>
        {data && <PaginationFooter page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="SKUs" />}
      </div>

      <WarehouseOverheadModal open={dialog === 'overhead'} onClose={() => setDialog(null)} canEdit={canWrite} />
      <OpexMappingModal open={dialog === 'mapping'} onClose={() => setDialog(null)} />
    </Container>
  )
}
