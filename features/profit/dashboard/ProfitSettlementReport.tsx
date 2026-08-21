'use client'

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef, // CHANGED: added
  useState,
} from 'react'

import { useSearchParams } from 'next/navigation'

import { Container } from '@/components/layout'

import {
  Card,
  CardContent,
} from '@/design-system/cards'

import { KpiCardSkeleton } from '@/design-system/loaders'

import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setFilters } from '@/store/profit.slice'

import { useGetAccountsQuery } from '@/services/api/accounts.api'

import { useDebounce } from '@/utils/debounce'

import {
  useGetSettlementReportProductsQuery,
  useGetProfitByOrderItemsQuery,
  PeriodSummary,
  PeriodSummaryPeriod,
  useGetSettlementReportSummaryQuery,
} from '@/services/api/profit.api'

import { SellerboardProductsTable } from './SellerboardProductsTable'
import { OrderItemsTable } from './OrderItemsTable'
import { TileDetailsModal } from './components/TileDetailsModal'

import { formatCurrency } from '@/utils/format'

import SummaryTiles from './SummaryTiles'

import { DateRangeValue } from '@/components/date-range-picker/DateRangePicker'

import ProfitDashboardHeader from '../dashboard/components/ProfitDashboardHeader'

import {
  ALL_MARKETPLACES,
  PRESET_PROFIT_SETTLEMENT_REPORT_PRESET,
  tilePresets,
  gridColsClass,
  nowInPST,
  toISODatePST,
  formatDateRangePST,
  addDaysPST,
  startOfMonthPST,
  endOfMonthPST,
  startOfWeekPST,
  endOfWeekPST,
  getRollingDateRangePST,
  getSingleDayPST,
  TIMEZONE,
  type CurrencyCode,
  type DashboardTab,
  type TableView,
  type TilePreset,
} from '@/utils/profitDashboard.util'
import ChartTab from './ChartTab'
import MapTab from './MapTab'
import PLTab from './PLTab'
import TrendsTab from './TrendsTab'

// CHANGED: localStorage keys for full state restoration
const LS_CUSTOM_RANGE = 'profit_settlement_custom_range'
const LS_SELECTED_TILE = 'profit_settlement_selected_tile'

// ════════════════════════════════════════════════════════
// ProfitSettlementReport
// ════════════════════════════════════════════════════════

export const ProfitSettlementReport: React.FC = () => {
  const dispatch = useAppDispatch()
  const profitFilters = useAppSelector((state) => state.profit.filters)

  const { data: accountsData } = useGetAccountsQuery()

  const searchParams = useSearchParams()
  const activeTab = (searchParams?.get('tab') as DashboardTab) || 'tiles'

  // ──────────────────────────────
  // Shared state (passed to tabs)
  // ──────────────────────────────

  const [appliedMarketplaces, setAppliedMarketplaces] = useState<string[]>(['Amazon.ca'])
  const [appliedCurrency, setAppliedCurrency] = useState<CurrencyCode>('CAD')

  // ──────────────────────────────
  // Tiles-only state
  // ──────────────────────────────

  const [tableView, setTableView] = useState<TableView>('products')

  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Applied tile filters
  const [appliedPresetId, setAppliedPresetId] = useState<string>(tilePresets[2].id)
  const [appliedCustomTileRange, setAppliedCustomTileRange] = useState<{
    startDate: string
    endDate: string
  } | null>(null)

  // Draft tile filters
  const [draftPresetId, setDraftPresetId] = useState<string>(tilePresets[2].id)
  const [draftCustomTileRange, setDraftCustomTileRange] = useState<{
    startDate: string
    endDate: string
  } | null>(null)
  const [draftMarketplaces, setDraftMarketplaces] = useState<string[]>(['Amazon.ca'])
  const [draftCurrency, setDraftCurrency] = useState<CurrencyCode>('CAD')

  const [tileDatePickerKey, setTileDatePickerKey] = useState(0)

  // Tile selection
  const [selectedTileId, setSelectedTileId] = useState<string>('yesterday')
  const [selectedPeriodForDetails, setSelectedPeriodForDetails] = useState<string | null>(null)

  // CHANGED: ref to prevent auto-resetting tile on initial restore
  const hasRestored = useRef(false)

  // suppress unused lint for PST helpers kept for future use
  void TIMEZONE
  void startOfMonthPST
  void endOfMonthPST
  void startOfWeekPST
  void endOfWeekPST

  // ──────────────────────────────
  // Restore full tile state from localStorage
  // ──────────────────────────────

  useEffect(() => {
    try {
      const savedPreset = localStorage.getItem(PRESET_PROFIT_SETTLEMENT_REPORT_PRESET)
      const savedRange = localStorage.getItem(LS_CUSTOM_RANGE)
      const savedTile = localStorage.getItem(LS_SELECTED_TILE)

      let presetToUse = tilePresets[2].id
      if (
        savedPreset &&
        (tilePresets.some((p) => p.id === savedPreset) || savedPreset === 'custom')
      ) {
        presetToUse = savedPreset
      }

      // CHANGED: if custom preset was saved but range is missing, fall back to default preset
      if (presetToUse === 'custom' && !savedRange) {
        presetToUse = tilePresets[2].id
      }

      setDraftPresetId(presetToUse)
      setAppliedPresetId(presetToUse)

      // CHANGED: restore custom range for both draft and applied
      if (presetToUse === 'custom' && savedRange) {
        const parsed = JSON.parse(savedRange)
        setDraftCustomTileRange(parsed)
        setAppliedCustomTileRange(parsed)
      }

      // CHANGED: restore selected tile (only if it exists in the restored preset)
      const restoredPreset =
        presetToUse === 'custom'
          ? { tiles: [{ id: 'custom-range' }] }
          : (tilePresets.find((p) => p.id === presetToUse) || tilePresets[0])

      if (savedTile && restoredPreset.tiles.some((t: any) => t.id === savedTile)) {
        setSelectedTileId(savedTile)
      } else {
        setSelectedTileId(restoredPreset.tiles[0].id)
      }

      hasRestored.current = true
    } catch {
      // ignore
    }
  }, [])

  // ──────────────────────────────
  // Persist selected tile whenever it changes
  // ──────────────────────────────

  useEffect(() => {
    try {
      localStorage.setItem(LS_SELECTED_TILE, selectedTileId)
    } catch {
      // ignore
    }
  }, [selectedTileId])

  // ──────────────────────────────
  // Default account
  // ──────────────────────────────

  useEffect(() => {
    if (!profitFilters.accountId && accountsData?.length) {
      dispatch(setFilters({ ...profitFilters, accountId: accountsData[0].id }))
    }
  }, [accountsData, dispatch, profitFilters])

  const effectiveAccountId = profitFilters.accountId || accountsData?.[0]?.id

  // ──────────────────────────────
  // Shared marketplace / currency handlers for tab containers
  // ──────────────────────────────

  const handleSharedMarketplacesChange = useCallback((value: string[]) => {
    setAppliedMarketplaces(value)
  }, [])

  const handleSharedCurrencyChange = useCallback((value: CurrencyCode) => {
    setAppliedCurrency(value)
  }, [])

  // ──────────────────────────────
  // Custom applied preset
  // ──────────────────────────────

  const appliedCustomPreset = useMemo<TilePreset>(() => {
    const range = appliedCustomTileRange || getRollingDateRangePST(7)
    return {
      id: 'custom',
      label: 'Custom range',
      tiles: [
        {
          id: 'custom-range',
          label: formatDateRangePST(range.startDate, range.endDate),
          apiPeriod: 'CUSTOM' as PeriodSummaryPeriod,
          getDateRange: () => range,
        },
      ],
    }
  }, [appliedCustomTileRange])

  // ──────────────────────────────
  // Custom draft preset
  // ──────────────────────────────

  const draftCustomPreset = useMemo<TilePreset>(() => {
    const range = draftCustomTileRange || getRollingDateRangePST(7)
    return {
      id: 'custom',
      label: 'Custom range',
      tiles: [
        {
          id: 'custom-range',
          label: formatDateRangePST(range.startDate, range.endDate),
          apiPeriod: 'CUSTOM' as PeriodSummaryPeriod,
          getDateRange: () => range,
        },
      ],
    }
  }, [draftCustomTileRange])

  // ──────────────────────────────
  // Current applied preset
  // ──────────────────────────────

  const currentPreset = useMemo(
    () =>
      appliedPresetId === 'custom'
        ? appliedCustomPreset
        : tilePresets.find((p) => p.id === appliedPresetId) || tilePresets[0],
    [appliedPresetId, appliedCustomPreset],
  )

  // ──────────────────────────────
  // Current draft preset
  // ──────────────────────────────

  const currentDraftPreset = useMemo(
    () =>
      draftPresetId === 'custom'
        ? draftCustomPreset
        : tilePresets.find((p) => p.id === draftPresetId) || tilePresets[0],
    [draftPresetId, draftCustomPreset],
  )

  void currentDraftPreset

  // ──────────────────────────────
  // Select first tile ONLY when preset changes via user action (not on restore)
  // ──────────────────────────────

  // CHANGED: removed the old useEffect that always reset tile on currentPreset change.
  // Instead we validate the tile inside handleApplyTileFilters.

  // ──────────────────────────────
  // Profit summary — standard presets
  // ──────────────────────────────

  const {
    data: profitData,
    isFetching: profitFetching,
    refetch: refetchProfit,
  } = useGetSettlementReportSummaryQuery(
    {
      accountId: effectiveAccountId,
      marketplaces: appliedMarketplaces.length ? appliedMarketplaces : ALL_MARKETPLACES,
      currency: appliedCurrency,
      preset: appliedPresetId !== 'custom' ? appliedPresetId : undefined,
    } as any,
    {
      skip: !effectiveAccountId || appliedPresetId === 'custom',
    },
  )

  // ──────────────────────────────
  // Profit summary — custom range
  // ──────────────────────────────

  const {
    data: customSummaryData,
    isFetching: customSummaryFetching,
    refetch: refetchCustomSummary,
  } = useGetSettlementReportSummaryQuery(
    {
      accountId: effectiveAccountId,
      marketplaces: appliedMarketplaces.length ? appliedMarketplaces : ALL_MARKETPLACES,
      currency: appliedCurrency,
      startDate: appliedCustomTileRange?.startDate,
      endDate: appliedCustomTileRange?.endDate,
    } as any,
    {
      skip:
        !effectiveAccountId ||
        appliedPresetId !== 'custom' ||
        !appliedCustomTileRange,
    },
  )

  const isFetchingActive = appliedPresetId === 'custom' ? customSummaryFetching : profitFetching
  const activeSummaryData = appliedPresetId === 'custom' ? customSummaryData : profitData

  // ──────────────────────────────
  // Period map
  // ──────────────────────────────

  const periodMap = useMemo(() => {
    if (appliedPresetId === 'custom') {
      const map = new Map<PeriodSummaryPeriod, PeriodSummary>()
      if (customSummaryData) {
        const raw: any = customSummaryData
        const single = Array.isArray(raw?.periods) ? raw.periods[0] : raw
        if (single) map.set('CUSTOM' as PeriodSummaryPeriod, single)
      }
      return map
    }

    if (!profitData?.periods) return new Map<PeriodSummaryPeriod, PeriodSummary>()

    return new Map(profitData.periods.map((period: any) => [period.period, period]))
  }, [profitData, appliedPresetId, customSummaryData])

  // ──────────────────────────────
  // Tile detail data
  // ──────────────────────────────

  const getPeriodDetailData = useCallback(
    (tileId: string) => {
      const tile = currentPreset.tiles.find((item) => item.id === tileId)
      if (!tile) return undefined

      const apiPeriod = periodMap.get(tile.apiPeriod)
      if (!apiPeriod) return undefined

      return {
        currency: apiPeriod.currency || appliedCurrency,
        salesRevenue: Number(apiPeriod.salesRevenue ?? 0),
        salesCount: Number(apiPeriod.salesCount ?? 0),
        ordersUnitCount: Number(apiPeriod.ordersUnitCount ?? 0),
        totalPromo: Number(apiPeriod.totalPromo ?? 0),
        advertisingCost: Number(apiPeriod.advertisingCost ?? 0),
        advertisingDetails: {
          sponsoredProducts: Number(apiPeriod.advertisingDetails?.sponsoredProducts ?? 0),
          sponsoredBrandsVideo: Number(apiPeriod.advertisingDetails?.sponsoredBrandsVideo ?? 0),
          sponsoredDisplay: Number(apiPeriod.advertisingDetails?.sponsoredDisplay ?? 0),
          sponsoredBrands: Number(apiPeriod.advertisingDetails?.sponsoredBrands ?? 0),
        },
        totalRefunds: Number(apiPeriod.totalRefunds ?? 0),
        totalRefundsCount: Number(apiPeriod.totalRefundsCount ?? 0),
        refundCost: Number(apiPeriod.refundCost ?? 0),
        refundPercentage: Number(apiPeriod.refundPercentage ?? 0),
        refundDetails: {
          refundedAmount: Number(apiPeriod.refundDetails?.refundedAmount ?? 0),
          refundCommission: Number(apiPeriod.refundDetails?.refundCommission ?? 0),
          promotion: Number(apiPeriod.refundDetails?.promotion ?? 0),
          valueOfReturnedItems: Number(apiPeriod.refundDetails?.valueOfReturnedItems ?? 0),
          refundedReferralFee: Number(apiPeriod.refundDetails?.refundedReferralFee ?? 0),
        },
        totalFees: Number(apiPeriod.totalFees ?? 0),
        amazonFeeDetails: {
          fbaStorageFee: Number(apiPeriod.amazonFeeDetails?.fbaStorageFee ?? 0),
          fbaPerUnitFulfillmentFee: Number(apiPeriod.amazonFeeDetails?.fbaPerUnitFulfillmentFee ?? 0),
          referralFee: Number(apiPeriod.amazonFeeDetails?.referralFee ?? 0),
          dealParticipationFee: Number(apiPeriod.amazonFeeDetails?.dealParticipationFee ?? 0),
          dealPerformanceFee: Number(apiPeriod.amazonFeeDetails?.dealPerformanceFee ?? 0),
          fbaDisposalFee: Number(apiPeriod.amazonFeeDetails?.fbaDisposalFee ?? 0),
          salesTaxCollectionFee: Number(apiPeriod.amazonFeeDetails?.salesTaxCollectionFee ?? 0),
          reversalReimbursement: Number(apiPeriod.amazonFeeDetails?.reversalReimbursement ?? 0),
          other: Number(apiPeriod.amazonFeeDetails?.other ?? 0),
        },
        totalCOGS: Number(apiPeriod.totalCOGS ?? 0),
        totalExpenses: Number(apiPeriod.totalExpenses ?? 0),
        grossProfit: Number(apiPeriod.grossProfit ?? 0),
        estimatedPayout: Number(apiPeriod.estimatedPayout ?? 0),
        netProfit: Number(apiPeriod.netProfit ?? 0),
        margin: Number(apiPeriod.margin ?? 0),
        realACOS: Number(apiPeriod.realACOS ?? 0),
        roi: Number(apiPeriod.roi ?? 0),
        _apiPeriod: apiPeriod,
      }
    },
    [currentPreset, periodMap, appliedCurrency],
  )

  // ──────────────────────────────
  // Period cards data
  // ──────────────────────────────

  const periodCardsData = useMemo(() => {
    const now = nowInPST()
    return currentPreset.tiles.map((tile) => {
      const period = periodMap.get(tile.apiPeriod)
      const range = tile.getDateRange(now)
      return {
        id: tile.id,
        label: tile.label,
        dateRange: formatDateRangePST(range.startDate, range.endDate),
        salesRevenue: Number(period?.salesRevenue ?? 0),
        salesCount: Number(period?.salesCount ?? 0),
        ordersUnitCount: Number(period?.ordersUnitCount ?? 0),
        totalFees: Number(period?.totalFees ?? 0),
        totalRefunds: Number(period?.totalRefunds ?? 0),
        totalRefundsCount: Number(period?.totalRefundsCount ?? 0),
        refundCost: Number(period?.refundCost ?? 0),
        totalCOGS: Number(period?.totalCOGS ?? 0),
        totalExpenses: Number(period?.totalExpenses ?? 0),
        totalPromo: Number(period?.totalPromo ?? 0),
        advertisingCost: Number(period?.advertisingCost ?? 0),
        grossProfit: Number(period?.grossProfit ?? 0),
        estimatedPayout: Number(period?.estimatedPayout ?? 0),
        netProfit: Number(period?.netProfit ?? 0),
        margin: Number(period?.margin ?? 0),
        realACOS: Number(period?.realACOS ?? 0),
        roi: Number(period?.roi ?? 0),
        refundPercentage: Number(period?.refundPercentage ?? 0),
        isFetching: isFetchingActive,
      }
    })
  }, [currentPreset, periodMap, isFetchingActive])

  // ──────────────────────────────
  // Selected tile
  // ──────────────────────────────

  const selectedTileConfig = currentPreset.tiles.find((tile) => tile.id === selectedTileId)

  const selectedTileRange = useMemo(() => {
    const now = nowInPST()
    return selectedTileConfig ? selectedTileConfig.getDateRange(now) : getSingleDayPST(1)
  }, [selectedTileConfig])

  // ──────────────────────────────
  // Active range for product table (tiles tab)
  // ──────────────────────────────

  const activeRange = useMemo(
    () => ({
      startDate: selectedTileRange.startDate || undefined,
      endDate: selectedTileRange.endDate || undefined,
    }),
    [selectedTileRange],
  )

  // ──────────────────────────────
  // Product query (tiles tab)
  // ──────────────────────────────

  const { data: productData, isFetching: productFetching } = useGetSettlementReportProductsQuery(
    {
      ...profitFilters,
      accountId: effectiveAccountId,
      marketplaces: appliedMarketplaces.length ? appliedMarketplaces : ALL_MARKETPLACES,
      currency: appliedCurrency,
      startDate: activeRange.startDate,
      endDate: activeRange.endDate,
    },
    {
      skip: !effectiveAccountId || tableView === 'order-items' || activeTab !== 'tiles',
    },
  )

  // ──────────────────────────────
  // Order items query (tiles tab)
  // ──────────────────────────────

  const { data: orderItemsData, isFetching: orderItemsFetching } =
    useGetProfitByOrderItemsQuery(
      {
        ...profitFilters,
        accountId: effectiveAccountId,
        marketplaces: appliedMarketplaces.length ? appliedMarketplaces : ALL_MARKETPLACES,
        currency: appliedCurrency,
        startDate: activeRange.startDate,
        endDate: activeRange.endDate,
      },
      {
        skip: !effectiveAccountId || tableView === 'products' || activeTab !== 'tiles',
      },
    )

  // ──────────────────────────────
  // Tile date presets
  // ──────────────────────────────

  const tileDatePresets = useMemo(
    () => [
      ...tilePresets.map((preset) => ({
        id: preset.id,
        label: preset.label,
        getRange: () => {
          const now = nowInPST()
          const ranges = preset.tiles.map((tile) => tile.getDateRange(now))
          const starts = ranges.map((r) => r.startDate).sort()
          const ends = ranges.map((r) => r.endDate).sort()
          return { startDate: starts[0], endDate: ends[ends.length - 1] }
        },
      })),
      {
        id: 'custom',
        label: 'Custom range',
        getRange: () => {
          const range = draftCustomTileRange || getRollingDateRangePST(7)
          return { startDate: range.startDate, endDate: range.endDate }
        },
      },
    ],
    [draftCustomTileRange],
  )

  // ──────────────────────────────
  // Tile date range value
  // ──────────────────────────────

  const tileDateRangeValue = useMemo<DateRangeValue>(() => {
    if (draftPresetId === 'custom') {
      const range = draftCustomTileRange || getRollingDateRangePST(7)
      return { startDate: range.startDate, endDate: range.endDate, presetId: 'custom', periodicity: 'day' }
    }

    const preset = tileDatePresets.find((item) => item.id === draftPresetId)
    const range = preset?.getRange()
    return {
      startDate: range?.startDate ?? null,
      endDate: range?.endDate ?? null,
      presetId: draftPresetId,
      periodicity: 'day',
    }
  }, [draftPresetId, draftCustomTileRange, tileDatePresets])

  // ──────────────────────────────
  // Tile date range change
  // ──────────────────────────────

  const handleTileDateRangeChange = useCallback((range: DateRangeValue) => {
    if (range.presetId && range.presetId !== 'custom') {
      setDraftPresetId(range.presetId)
      setDraftCustomTileRange(null)
      return
    }
    if (range.startDate && range.endDate) {
      setDraftCustomTileRange({ startDate: range.startDate, endDate: range.endDate })
      setDraftPresetId('custom')
    }
  }, [])

  // ──────────────────────────────
  // Apply tile filters
  // ──────────────────────────────

  const handleApplyTileFilters = useCallback(() => {
    const nextPresetId = draftPresetId
    const nextCustomRange = nextPresetId === 'custom' ? draftCustomTileRange : null

    setAppliedPresetId(nextPresetId)
    setAppliedCustomTileRange(nextCustomRange)
    setAppliedMarketplaces([...draftMarketplaces])
    setAppliedCurrency(draftCurrency)

    // CHANGED: validate selected tile exists in the new preset; reset only if it doesn't
    const nextPreset =
      nextPresetId === 'custom'
        ? { tiles: [{ id: 'custom-range' }] }
        : (tilePresets.find((p) => p.id === nextPresetId) || tilePresets[0])

    setSelectedTileId((current) => {
      if (nextPreset.tiles.some((t: any) => t.id === current)) {
        return current
      }
      return nextPreset.tiles[0].id
    })

    dispatch(
      setFilters({
        ...profitFilters,
        marketplaces: [...draftMarketplaces],
        currency: draftCurrency,
      }),
    )

    setTileDatePickerKey((key) => key + 1)

    try {
      localStorage.setItem(PRESET_PROFIT_SETTLEMENT_REPORT_PRESET, nextPresetId)
      // CHANGED: persist custom range so it reloads correctly
      if (nextPresetId === 'custom' && nextCustomRange) {
        localStorage.setItem(LS_CUSTOM_RANGE, JSON.stringify(nextCustomRange))
      } else {
        localStorage.removeItem(LS_CUSTOM_RANGE)
      }
    } catch {
      // ignore
    }
  }, [draftPresetId, draftCustomTileRange, draftMarketplaces, draftCurrency, dispatch, profitFilters])

  // ──────────────────────────────
  // Reload (tiles)
  // ──────────────────────────────

  const handleReload = useCallback(() => {
    if (appliedPresetId === 'custom') {
      refetchCustomSummary()
    } else {
      refetchProfit()
    }
  }, [appliedPresetId, refetchProfit, refetchCustomSummary])

  // ──────────────────────────────
  // Render
  // ──────────────────────────────

  return (
    <div className="w-full">
      <Container size="full">

        {/* ════════════════════════════════ */}
        {/* CHART TAB                        */}
        {/* ════════════════════════════════ */}

        {activeTab === 'chart' && (
          <ChartTab
            effectiveAccountId={effectiveAccountId}
            appliedMarketplaces={appliedMarketplaces}
            appliedCurrency={appliedCurrency}
            onMarketplacesChange={handleSharedMarketplacesChange}
            onCurrencyChange={handleSharedCurrencyChange}
          />
        )}

        {/* ════════════════════════════════ */}
        {/* TILES TAB                        */}
        {/* ════════════════════════════════ */}

        {activeTab === 'tiles' && (
          <>
            {/* Loading skeleton */}
            {isFetchingActive && (
              <div className="bg-surface-secondary border border-border rounded-xl p-6 mb-6 animate-pulse">
                <div className="h-6 bg-border rounded w-1/3 mb-4" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                  {[...Array(4)].map((_, index) => (
                    <div key={index} className="h-8 bg-border rounded" />
                  ))}
                </div>
              </div>
            )}

            {/* Overview banner */}
            {activeSummaryData?.summary && !isFetchingActive && (
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white mb-6">
                <h2 className="text-lg font-semibold mb-4">
                  Profit Overview ({currentPreset.label})
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-3xl font-bold">
                      {formatCurrency(activeSummaryData.summary.totalRevenue)}
                    </div>
                    <div className="text-blue-100 text-sm">Total Revenue</div>
                  </div>
                  <div>
                    <div
                      className={`text-3xl font-bold ${
                        activeSummaryData.summary.totalProfit >= 0
                          ? 'text-green-300'
                          : 'text-red-300'
                      }`}
                    >
                      {formatCurrency(activeSummaryData.summary.totalProfit)}
                    </div>
                    <div className="text-blue-100 text-sm">Total Net Profit</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">
                      {activeSummaryData.summary.totalOrders}
                    </div>
                    <div className="text-blue-100 text-sm">Total Orders</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">
                      {activeSummaryData.summary.totalUnits}
                    </div>
                    <div className="text-blue-100 text-sm">Total Units</div>
                  </div>
                </div>
              </div>
            )}

            {/* Tiles header */}
            <ProfitDashboardHeader
              isFiltering={false}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              dateRange={tileDateRangeValue}
              datePresets={tileDatePresets}
              keepOpenPresetIds={['custom']}
              onDateRangeChange={handleTileDateRangeChange}
              dateDisplayFormat="MMM d, yyyy"
              datePlaceholder="Select date range"
              marketplaces={draftMarketplaces}
              onMarketplacesChange={setDraftMarketplaces}
              currency={draftCurrency}
              onCurrencyChange={(value) => setDraftCurrency(value as CurrencyCode)}
              currencyOptions={[
                { value: 'CAD', label: 'CAD' },
                { value: 'USD', label: 'USD' },
                { value: 'EUR', label: 'EUR' },
              ]}
              onFilter={handleApplyTileFilters}
              searchWidth="w-[55%]"
              datePickerKey={tileDatePickerKey}
            />

            {/* Period cards */}
            <div
              className={
                appliedPresetId === 'custom'
                  ? 'grid grid-cols-1 gap-4 mb-6 max-w-md'
                  : `grid grid-cols-1 md:grid-cols-2 ${
                      gridColsClass[Math.min(currentPreset.tiles.length, 5)]
                    } gap-4 mb-6`
              }
            >
              {periodCardsData.map((period) => {
                if (period.isFetching) {
                  return (
                    <Card
                      key={period.id}
                      className="bg-surface border border-border min-h-[400px] min-w-0 flex flex-col"
                    >
                      <CardContent className="p-4 flex-1">
                        <KpiCardSkeleton />
                      </CardContent>
                    </Card>
                  )
                }

                return (
                  <Card
                    key={period.id}
                    className={`bg-surface border border-border cursor-pointer transition-shadow hover:shadow-md min-h-[400px] min-w-0 flex flex-col ${
                      selectedTileId === period.id ? 'ring-2 ring-primary-200' : ''
                    }`}
                    onClick={() => setSelectedTileId(period.id)}
                  >
                    <CardContent className="p-4 break-words min-w-0 flex-1 flex flex-col">
                      <SummaryTiles
                        setSelectedPeriodForDetails={setSelectedPeriodForDetails}
                        period={period}
                      />
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Products table */}
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-border flex-wrap gap-3">
                  <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold text-text-primary">
                      {selectedTileConfig?.label || 'Period'}
                    </h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTableView('products')}
                        className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                          tableView === 'products'
                            ? 'bg-primary-600 text-white'
                            : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary'
                        }`}
                      >
                        Products
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {tableView === 'products' ? (
                    <SellerboardProductsTable
                      products={productData as any}
                      isLoading={productFetching}
                      isFetching={productFetching}
                      searchTerm={debouncedSearchTerm}
                    />
                  ) : (
                    <OrderItemsTable
                      orderItems={orderItemsData}
                      isLoading={orderItemsFetching}
                      searchTerm={debouncedSearchTerm}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ════════════════════════════════ */}
        {/* P&L TAB                          */}
        {/* ════════════════════════════════ */}

        {activeTab === 'pnl' && (
          <PLTab
            effectiveAccountId={effectiveAccountId}
            appliedMarketplaces={appliedMarketplaces}
            appliedCurrency={appliedCurrency}
            onMarketplacesChange={handleSharedMarketplacesChange}
            onCurrencyChange={handleSharedCurrencyChange}
          />
        )}

        {/* ════════════════════════════════ */}
        {/* MAP TAB                          */}
        {/* ════════════════════════════════ */}

        {activeTab === 'map' && (
          <MapTab
            effectiveAccountId={effectiveAccountId}
            appliedMarketplaces={appliedMarketplaces}
            appliedCurrency={appliedCurrency}
            onMarketplacesChange={handleSharedMarketplacesChange}
            onCurrencyChange={handleSharedCurrencyChange}
          />
        )}

        {/* ════════════════════════════════ */}
        {/* TRENDS TAB                       */}
        {/* ════════════════════════════════ */}

        {activeTab === 'trends' && (
          <TrendsTab
            effectiveAccountId={effectiveAccountId}
            appliedMarketplaces={appliedMarketplaces}
            appliedCurrency={appliedCurrency}
            onMarketplacesChange={handleSharedMarketplacesChange}
            onCurrencyChange={handleSharedCurrencyChange}
          />
        )}

        {/* ════════════════════════════════ */}
        {/* TILE DETAILS MODAL               */}
        {/* ════════════════════════════════ */}

        {selectedPeriodForDetails && (
          <TileDetailsModal
            isOpen={!!selectedPeriodForDetails}
            onClose={() => setSelectedPeriodForDetails(null)}
            periodLabel={
              periodCardsData.find((p) => p.id === selectedPeriodForDetails)?.label || ''
            }
            dateRange={
              periodCardsData.find((p) => p.id === selectedPeriodForDetails)?.dateRange || ''
            }
            data={getPeriodDetailData(selectedPeriodForDetails)}
            currency={appliedCurrency}
          />
        )}

      </Container>
    </div>
  )
}

export default ProfitSettlementReport