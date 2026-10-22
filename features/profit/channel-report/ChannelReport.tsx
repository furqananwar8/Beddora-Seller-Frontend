'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { toast } from 'sonner'

import { Container } from '@/components/layout'
import { Switch } from '@/components/switch/Switch'
import { Card, CardContent } from '@/design-system/cards'
import { Input } from '@/design-system/inputs'
import { RowActionsMenu } from '@/components/row-actions-menu/RowActionsMenu'
import { useReportExport } from '@/hooks/useReportExport'
import { KpiCardSkeleton } from '@/design-system/loaders'
import ProfitDashboardHeader from '@/features/profit/dashboard/components/ProfitDashboardHeader'
import { ProfitOverviewBanner } from '@/features/profit/dashboard/components/ProfitOverviewBanner'
import { TileDetailsModal } from '@/features/profit/dashboard/components/TileDetailsModal'
import { useTilePeriodFilters } from '@/features/profit/dashboard/hooks/useTilePeriodFilters'
import { SellerboardProductsTable } from '@/features/profit/dashboard/SellerboardProductsTable'
import SummaryTiles, { SUMMARY_TILE_GRID, type SummaryTileMetric } from '@/features/profit/dashboard/SummaryTiles'
import { useDebounce } from '@/utils/debounce'
import { formatNumber } from '@/utils/format'
import { formatDateRangePST, nowInPST, type CurrencyCode } from '@/utils/profitDashboard.util'

import type { ChannelId, ChannelReportParams, ReportBasis } from './channelReport.types'
import { LISTING_COST_BUCKETS, type BucketDefinition } from './config/buckets'
import { joinChannelNames } from './config/channels'
import { ChannelBreakdown } from './components/ChannelBreakdown'
import { ChannelChips } from './components/ChannelBadges'
import { ChannelMultiSelect } from './components/ChannelMultiSelect'
import { buildChannelProductColumns } from './components/channelProductColumns'
import { ChannelShareBar } from './components/ChannelShareBar'
import { useChannelConnections, useChannelListings, useChannelReportSummary } from './data/useChannelReportData'
import { combinePeriod, type CombinedPeriod } from './lib/aggregate'
import { formatMoney, NOT_REPORTED } from './lib/format'
import { buildProductRows, countUnlinked, rowBreakdown, type ProductRow } from './lib/productRows'

const STORAGE_KEY = 'profit-channel-report-preset'
const DEFAULT_MARKETPLACES = ['Amazon.ca']
const CURRENCY_OPTIONS = [
  { value: 'CAD', label: 'CAD' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
]
/** Table-filter option that narrows the table to listings with no master product. */
const UNLINKED_OPTION = { id: '__unlinked', name: 'Only unlinked listings', description: 'SKUs not yet matched to a product', excludeFromAll: true, separatorBefore: true }
/** The Live Report always reads Business Report data (orders by order date). */
const REPORT_BASIS: ReportBasis = 'business'
const MTD_PERIOD = 'MONTH_TO_DATE'
const PAGE_SIZE = 8
const NO_CHANNELS: ChannelId[] = []
/** Tile cells the Live Report leaves out. */
const HIDDEN_TILE_METRICS: SummaryTileMetric[] = ['refunds', 'secondary']

/** What the breakdown modal shows: a period tile or a products-table row. */
interface BreakdownTarget {
  title: string
  dateRange: string
  data: CombinedPeriod
  /** Cost sections; defaults to every bucket. */
  sections?: BucketDefinition[]
}

/**
 * True while a query has data on the way: fetching, or about to start (a query that just stopped being skipped is
 * uninitialized for one render). A skipped query (no channel selected) stays uninitialized and is not pending.
 */
const isPending = (query: { isFetching: boolean; isUninitialized: boolean }, skipped = false) =>
  query.isFetching || (query.isUninitialized && !skipped)

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((item) => b.includes(item))

export const ChannelReport: React.FC = () => {
  // ──────────────────────────────
  // Filters (draft until Apply Filters)
  // ──────────────────────────────

  const period = useTilePeriodFilters({ storageKey: STORAGE_KEY })
  const { data: connectionsData, isLoading: connectionsLoading } = useChannelConnections()
  const connections = connectionsData ?? []
  // Stable while loading, so the selections derived from it do not change on every render
  const connectedChannels = useMemo(
    () => connectionsData?.map((item) => item.channel) ?? NO_CHANNELS,
    [connectionsData],
  )

  // null until the user picks channels: every connected channel, as soon as the connections arrive
  const [draftSelection, setDraftChannels] = useState<ChannelId[] | null>(null)
  const [appliedSelection, setAppliedChannels] = useState<ChannelId[] | null>(null)
  const draftChannels = draftSelection ?? connectedChannels
  const appliedChannels = appliedSelection ?? connectedChannels
  const [draftMarketplaces, setDraftMarketplaces] = useState<string[]>(DEFAULT_MARKETPLACES)
  const [appliedMarketplaces, setAppliedMarketplaces] = useState<string[]>(DEFAULT_MARKETPLACES)
  const [draftCurrency, setDraftCurrency] = useState<CurrencyCode>('CAD')
  const [appliedCurrency, setAppliedCurrency] = useState<CurrencyCode>('CAD')

  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)

  const filterPending =
    period.isDirty ||
    !sameSet(draftChannels, appliedChannels) ||
    !sameSet(draftMarketplaces, appliedMarketplaces) ||
    draftCurrency !== appliedCurrency

  const applyFilters = useCallback(() => {
    period.apply()
    setAppliedChannels([...draftChannels])
    setAppliedMarketplaces([...draftMarketplaces])
    setAppliedCurrency(draftCurrency)
  }, [period, draftChannels, draftMarketplaces, draftCurrency])

  // ──────────────────────────────
  // Data
  // ──────────────────────────────

  const baseParams = {
    channels: appliedChannels,
    marketplaces: appliedMarketplaces,
    currency: appliedCurrency,
    basis: REPORT_BASIS,
  }
  const noChannels = appliedChannels.length === 0
  const tilePeriods = period.currentPreset.tiles.map((tile) => tile.apiPeriod as string)

  const summaryParams: ChannelReportParams = period.isCustom
    ? { ...baseParams, startDate: period.appliedRange?.startDate, endDate: period.appliedRange?.endDate }
    : { ...baseParams, periods: tilePeriods }

  const summaryQuery = useChannelReportSummary(summaryParams, { skip: noChannels })
  const summary = summaryQuery.data
  const summaryFetching = connectionsLoading || isPending(summaryQuery, noChannels)

  // The banner always shows month to date: reuse the MTD tile when there is one, else ask for it
  const tilesHaveMtd = !period.isCustom && tilePeriods.includes(MTD_PERIOD)
  const mtdQuery = useChannelReportSummary({ ...baseParams, periods: [MTD_PERIOD] }, { skip: noChannels || tilesHaveMtd })
  const mtdSummary = mtdQuery.data
  const mtdFetching = connectionsLoading || isPending(mtdQuery, noChannels || tilesHaveMtd)
  const bannerSummary = tilesHaveMtd ? summary : mtdSummary
  const bannerFetching = tilesHaveMtd ? summaryFetching : mtdFetching

  const listingsQuery = useChannelListings(
    {
      ...baseParams,
      startDate: period.selectedTileRange.startDate,
      endDate: period.selectedTileRange.endDate,
    },
    { skip: noChannels },
  )
  const listings = listingsQuery.data
  const listingsFetching = connectionsLoading || isPending(listingsQuery, noChannels)

  const periods = useMemo(() => {
    const map = new Map<string, CombinedPeriod>()
    summary?.forEach((item) => map.set(item.period, combinePeriod(item, appliedChannels)))
    return map
  }, [summary, appliedChannels])

  const bannerPeriod = useMemo(() => {
    const mtd = bannerSummary?.find((item) => item.period === MTD_PERIOD)
    return mtd ? combinePeriod(mtd, appliedChannels) : undefined
  }, [bannerSummary, appliedChannels])

  const tiles = useMemo(() => {
    const now = nowInPST()
    return period.currentPreset.tiles.map((tile) => {
      const range = tile.getDateRange(now)
      return { tile, dateRange: formatDateRangePST(range.startDate, range.endDate), data: periods.get(tile.apiPeriod) }
    })
  }, [period.currentPreset, periods])

  // ──────────────────────────────
  // Products table (table-local filters apply immediately)
  // ──────────────────────────────

  const [groupListings, setGroupListings] = useState(true)
  const [tableChannels, setTableChannels] = useState<ChannelId[]>(appliedChannels)
  const [onlyUnlinked, setOnlyUnlinked] = useState(false)
  const [tableSearch, setTableSearch] = useState('')
  const debouncedTableSearch = useDebounce(tableSearch, 300)

  useEffect(() => {
    setTableChannels(appliedChannels)
    setOnlyUnlinked(false)
  }, [appliedChannels])

  const multiChannel = appliedChannels.length > 1

  const rows = useMemo(() => {
    if (!listings) return []
    const channels = tableChannels.length ? tableChannels : appliedChannels
    const byPageSearch = buildProductRows(listings, {
      channels,
      onlyUnlinked,
      search: debouncedSearch,
      group: true,
      groupListings: groupListings && multiChannel,
    })
    if (!debouncedTableSearch.trim()) return byPageSearch
    const tableIds = new Set(
      buildProductRows(listings, { channels, onlyUnlinked, search: debouncedTableSearch, group: false }).map(
        (row) => row.key,
      ),
    )
    // Keep a row when it, or one of the rows under it (products of a parent, linked listings), matches the table search
    const matches = (row: ProductRow): boolean => tableIds.has(row.key) || Boolean(row.children?.some(matches))
    return byPageSearch.filter(matches)
  }, [listings, tableChannels, appliedChannels, onlyUnlinked, debouncedSearch, debouncedTableSearch, groupListings, multiChannel])

  const unlinkedCount = countUnlinked(rows)

  // ──────────────────────────────
  // Breakdown modal (tiles and table rows share it)
  // ──────────────────────────────

  const [details, setDetails] = useState<BreakdownTarget | null>(null)

  const openTileDetails = useCallback(
    (tileId: string) => {
      const item = tiles.find((entry) => entry.tile.id === tileId)
      if (item?.data) setDetails({ title: item.tile.label, dateRange: item.dateRange, data: item.data })
    },
    [tiles],
  )

  const { selectedTile, selectedTileRange } = period
  const openRowDetails = useCallback(
    (row: ProductRow) =>
      setDetails({
        title: row.title,
        dateRange: `${selectedTile.label} · ${formatDateRangePST(selectedTileRange.startDate, selectedTileRange.endDate)}`,
        data: rowBreakdown(row, selectedTile.apiPeriod),
        sections: LISTING_COST_BUCKETS,
      }),
    [selectedTile, selectedTileRange],
  )

  const columns = useMemo(
    () =>
      buildChannelProductColumns({
        onLinkProduct: (row: ProductRow) =>
          toast.info(`Linking "${row.listing?.channelSku}" to a product arrives with the API phase.`),
        onShowDetails: openRowDetails,
      }),
    [openRowDetails],
  )

  // Excel export of the products table, with the same filters the table shows
  const { start: startExport, isExporting } = useReportExport('channel-report-listings')
  const exportFilters = {
    ...baseParams,
    channels: tableChannels.length ? tableChannels : appliedChannels,
    startDate: period.selectedTileRange.startDate,
    endDate: period.selectedTileRange.endDate,
    onlyUnlinked,
    search: debouncedTableSearch || debouncedSearch,
  }

  const tableFilterValue = onlyUnlinked ? [...tableChannels, UNLINKED_OPTION.id] : tableChannels
  const handleTableFilterChange = (value: string[]) => {
    setOnlyUnlinked(value.includes(UNLINKED_OPTION.id))
    setTableChannels(value.filter((id) => id !== UNLINKED_OPTION.id))
  }

  // ──────────────────────────────
  // Render
  // ──────────────────────────────

  return (
    <div className="w-full">
      <Container size="full">
        {bannerFetching && !bannerPeriod && (
          <div className="bg-surface-secondary border border-border rounded-xl p-6 mb-6 animate-pulse">
            <div className="h-6 bg-border rounded w-1/3 mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="h-8 bg-border rounded" />
              ))}
            </div>
          </div>
        )}

        {bannerPeriod && (
          <ProfitOverviewBanner
            title={`Month to date · ${joinChannelNames(bannerPeriod.channels)}`}
            totalRevenue={bannerPeriod.sales}
            totalOrders={bannerPeriod.orders}
            totalUnits={bannerPeriod.units}
            formatAmount={formatMoney}
          >
            <ChannelShareBar
              shares={bannerPeriod.shares}
              tone="dark"
              showLegend
              className="mt-5"
            />
          </ProfitOverviewBanner>
        )}

        {/* One line: search takes the room the filters leave, every control sits next to it */}
        <ProfitDashboardHeader
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchWidth="flex-1 min-w-[180px]"
          dateRange={period.dateRangeValue}
          datePresets={period.datePresets}
          keepOpenPresetIds={period.keepOpenPresetIds}
          onDateRangeChange={period.onDateRangeChange}
          datePickerKey={period.datePickerKey}
          extraFilters={
            <div className="min-w-[160px] shrink-0">
              <ChannelMultiSelect
                channels={connectedChannels}
                connections={connections}
                value={draftChannels}
                onChange={setDraftChannels}
              />
            </div>
          }
          marketplaces={draftMarketplaces}
          onMarketplacesChange={setDraftMarketplaces}
          currency={draftCurrency}
          onCurrencyChange={(value) => setDraftCurrency(value as CurrencyCode)}
          currencyOptions={CURRENCY_OPTIONS}
          currencyAsDropdown
          paddingClassName="py-4"
          onFilter={applyFilters}
          filterPending={filterPending}
        />

        {/* Period tiles */}
        <div
          className={SUMMARY_TILE_GRID}
        >
          {tiles.map(({ tile, dateRange, data }) => {
            if (summaryFetching) {
              return (
                <Card key={tile.id} className="bg-surface border border-border min-w-0 flex flex-col">
                  <CardContent className="p-4 flex-1">
                    <KpiCardSkeleton />
                  </CardContent>
                </Card>
              )
            }

            const ads = data?.buckets.ads.total ?? null

            return (
              <Card
                key={tile.id}
                className={`bg-surface border border-border cursor-pointer transition-shadow hover:shadow-md min-w-0 flex flex-col ${
                  period.selectedTile.id === tile.id ? 'ring-2 ring-primary-600' : ''
                }`}
                onClick={() => period.setSelectedTileId(tile.id)}
              >
                <CardContent className="p-4 break-words min-w-0 flex-1 flex flex-col">
                  <SummaryTiles
                    period={{
                      id: tile.id,
                      label: tile.label,
                      dateRange,
                      salesRevenue: data?.sales ?? 0,
                      salesCount: formatNumber(data?.orders ?? 0, 0),
                      ordersUnitCount: formatNumber(data?.units ?? 0, 0),
                      margin: data?.margin ?? 0,
                    }}
                    formatAmount={formatMoney}
                    showTooltips={false}
                    salesChange={data?.salesChangePct ?? null}
                    salesFooter={
                      data && (
                        <ChannelShareBar shares={data.shares} className="mt-2" />
                      )
                    }
                    advertisingDisplay={ads === null ? NOT_REPORTED : formatMoney(ads)}
                    hiddenMetrics={HIDDEN_TILE_METRICS}
                    showNetProfit={false}
                    moreLabel="See breakdown"
                    setSelectedPeriodForDetails={openTileDetails}
                  />
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Products */}
        <Card className="overflow-visible">
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-border flex-wrap gap-3">
              <div className="flex items-center gap-4 flex-wrap">
                <h2 className="text-lg font-semibold text-text-primary">{period.selectedTile.label}</h2>
                <span className="px-4 py-1.5 text-sm font-medium rounded bg-primary-600 text-white">Products</span>
                {multiChannel && (
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-lg cursor-pointer">
                    <Switch checked={groupListings} onCheckedChange={setGroupListings} aria-label="Group linked listings" />
                    Group linked listings
                  </label>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <ChannelMultiSelect
                  prefix="Channel:"
                  channels={appliedChannels}
                  value={tableFilterValue}
                  onChange={handleTableFilterChange}
                  extraOptions={[UNLINKED_OPTION]}
                />
                <div className="flex items-center gap-2">
                  <RowActionsMenu
                    label="products table"
                    items={[
                      {
                        key: 'export-excel',
                        label: 'Export Excel',
                        onSelect: () => startExport('xlsx', exportFilters),
                        disabled: noChannels || isExporting,
                        disabledReason: isExporting ? 'An export is being prepared…' : undefined,
                      },
                    ]}
                  />
                  <div className="relative w-[220px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <Input
                      type="text"
                      placeholder="Search any channel SKU"
                      value={tableSearch}
                      onChange={(event) => setTableSearch(event.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-surface border border-border rounded-lg"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <SellerboardProductsTable
                key={`${appliedChannels.join()}|${period.selectedTile.id}|${tableFilterValue.join()}|${groupListings}`}
                products={rows as any}
                isLoading={listingsFetching && !listings}
                isFetching={listingsFetching}
                columns={columns}
                getRowKey={(row: ProductRow) => row.key}
                pageSize={PAGE_SIZE}
                searchTerm={debouncedTableSearch || debouncedSearch}
                emptyMessage="No listings match these filters."
                footerContent={({ to, total }) => (
                  <>
                    Showing {to} of {total} products
                    {unlinkedCount > 0 && <> · {unlinkedCount} unlinked listings need a product match</>}
                    {' · '}
                    <b>{NOT_REPORTED}</b> = channel doesn&apos;t report this cost (not counted as $0)
                  </>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {details && (
          <TileDetailsModal
            isOpen
            onClose={() => setDetails(null)}
            periodLabel={details.title}
            dateRange={details.dateRange}
            data={details.data}
            currency={appliedCurrency}
            headerExtra={<ChannelChips channels={details.data.channels} className="mt-2" />}
            renderBody={(data: CombinedPeriod) => (
              <ChannelBreakdown period={data} sections={details.sections} />
            )}
          />
        )}
      </Container>
    </div>
  )
}

export default ChannelReport
