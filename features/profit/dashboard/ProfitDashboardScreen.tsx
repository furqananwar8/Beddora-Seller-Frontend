'use client'

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { useSearchParams } from 'next/navigation'

import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import { Select, Input } from '@/design-system/inputs'
import {
  Card,
  CardContent,
} from '@/design-system/cards'
import { KpiCardSkeleton } from '@/design-system/loaders'

import {
  useAppDispatch,
  useAppSelector,
} from '@/store/hooks'

import { setFilters } from '@/store/profit.slice'

import {
  useGetAccountsQuery,
} from '@/services/api/accounts.api'

import { useDebounce } from '@/utils/debounce'

import {
  useGetProfitSummaryQuery,
  useGetProfitByProductQuery,
  useGetProfitByOrderItemsQuery,
  useGetPLByPeriodsQuery,
  ProfitFilters,
  PeriodSummary,
  PeriodSummaryPeriod,
} from '@/services/api/profit.api'

import {
  useGetDashboardChartQuery,
  ChartPeriod,
} from '@/services/api/charts.api'

import { SellerboardProductsTable } from './SellerboardProductsTable'
import { OrderItemsTable } from './OrderItemsTable'
import { DashboardChart } from './DashboardChart'
import { PLTable } from './PLTable'

import { MapComponent } from './components/MapComponent'
import { TrendsComponent } from './components/TrendsComponent'
import { ChartSummaryTable } from './components/ChartSummaryTable'
import { TileDetailsModal } from './components/TileDetailsModal'

import { formatCurrency } from '@/utils/format'

import SummaryTiles from './SummaryTiles'

import { MARKETPLACES } from '@/utils/marketplaces'

import DateRangePicker, {
  DateRangeValue,
} from '@/components/date-range-picker/DateRangePicker'

import ProfitDashboardHeader from '../dashboard/components/ProfitDashboardHeader'

import { MultiSelectInput } from '@/components/multi-select-input/MultiSelectInput'

import {
  TIMEZONE,
  ALL_MARKETPLACES,
  PRESET_STORAGE_KEY,

  tilePresets,
  chartPresets,
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

  inferPeriodicity,

  type CurrencyCode,
  type DashboardTab,
  type TableView,
  type TilePreset,
} from '@/utils/profitDashboard.util'

export const ProfitDashboardScreen: React.FC =
  () => {
    const dispatch =
      useAppDispatch()

    const profitFilters =
      useAppSelector(
        (state) =>
          state.profit.filters
      )

    const {
      data: accountsData,
    } =
      useGetAccountsQuery()

    const searchParams =
      useSearchParams()

    const activeTab =
      (searchParams?.get(
        'tab'
      ) as DashboardTab) ||
      'tiles'

    // ============================================
    // TABLE
    // ============================================

    const [
      tableView,
      setTableView,
    ] =
      useState<TableView>(
        'products'
      )

    // ============================================
    // SEARCH
    // ============================================

    const [
      searchTerm,
      setSearchTerm,
    ] =
      useState('')

    const debouncedSearchTerm =
      useDebounce(
        searchTerm,
        300
      )

    // ============================================
    // APPLIED TILE FILTERS
    // ============================================

    const [
      appliedPresetId,
      setAppliedPresetId,
    ] =
      useState<string>(
        tilePresets[2].id
      )

    const [
      appliedCustomTileRange,
      setAppliedCustomTileRange,
    ] =
      useState<{
        startDate: string
        endDate: string
      } | null>(null)

    const [
      appliedMarketplaces,
      setAppliedMarketplaces,
    ] =
      useState<string[]>([
        'Amazon.ca',
      ])

    const [
      appliedCurrency,
      setAppliedCurrency,
    ] =
      useState<CurrencyCode>(
        'CAD'
      )

    // ============================================
    // DRAFT TILE FILTERS
    // ============================================

    const [
      draftPresetId,
      setDraftPresetId,
    ] =
      useState<string>(
        tilePresets[2].id
      )

    const [
      draftCustomTileRange,
      setDraftCustomTileRange,
    ] =
      useState<{
        startDate: string
        endDate: string
      } | null>(null)

    const [
      draftMarketplaces,
      setDraftMarketplaces,
    ] =
      useState<string[]>([
        'Amazon.ca',
      ])

    const [
      draftCurrency,
      setDraftCurrency,
    ] =
      useState<CurrencyCode>(
        'CAD'
      )

    // ============================================
    // CUSTOM DATE PICKER INSTANCE
    //
    // DateRangePicker can retain internal custom
    // range state after the first apply.
    //
    // Incrementing this key after Apply forces a
    // fresh picker instance for the next selection.
    // ============================================

    const [
      tileDatePickerKey,
      setTileDatePickerKey,
    ] =
      useState(0)

    // ============================================
    // TILE SELECTION
    // ============================================

    const [
      selectedTileId,
      setSelectedTileId,
    ] =
      useState<string>(
        'yesterday'
      )

    const [
      selectedPeriodForDetails,
      setSelectedPeriodForDetails,
    ] =
      useState<string | null>(
        null
      )

    // ============================================
    // CHART / P&L RANGE
    // ============================================

    const [
      dateRange,
      setDateRange,
    ] =
      useState<
        DateRangeValue & {
          periodicity?: string
        }
      >({
        startDate:
          toISODatePST(
            addDaysPST(
              nowInPST(),
              -29
            )
          ),

        endDate:
          toISODatePST(
            nowInPST()
          ),

        presetId:
          'last-30-days',

        periodicity:
          'day',
      })

    const [
      page,
      setPage,
    ] =
      useState<number>(1)

    // Keep these imported/declared values available
    // for the existing dashboard behavior.
    void TIMEZONE
    void page
    void startOfMonthPST
    void endOfMonthPST
    void startOfWeekPST
    void endOfWeekPST

    // ============================================
    // RESTORE TILE PRESET
    // ============================================

    useEffect(() => {
      try {
        const saved =
          localStorage.getItem(
            PRESET_STORAGE_KEY
          )

        if (
          saved &&
          (
            tilePresets.some(
              (preset) =>
                preset.id ===
                saved
            ) ||
            saved === 'custom'
          )
        ) {
          setDraftPresetId(
            saved
          )

          setAppliedPresetId(
            saved
          )
        }
      } catch {
        // Ignore localStorage errors.
      }
    }, [])

    // ============================================
    // DEFAULT ACCOUNT
    // ============================================

    useEffect(() => {
      if (
        !profitFilters.accountId &&
        accountsData?.length
      ) {
        dispatch(
          setFilters({
            ...profitFilters,
            accountId:
              accountsData[0].id,
          })
        )
      }
    }, [
      accountsData,
      dispatch,
      profitFilters,
    ])

    const effectiveAccountId =
      profitFilters.accountId ||
      accountsData?.[0]?.id

    // ============================================
    // CUSTOM APPLIED PRESET
    // ============================================

    const appliedCustomPreset =
      useMemo<TilePreset>(
        () => {
          const range =
            appliedCustomTileRange ||
            getRollingDateRangePST(
              7
            )

          return {
            id: 'custom',

            label:
              'Custom range',

            tiles: [
              {
                id:
                  'custom-range',

                label:
                  formatDateRangePST(
                    range.startDate,
                    range.endDate
                  ),

                apiPeriod:
                  'CUSTOM' as PeriodSummaryPeriod,

                getDateRange:
                  () =>
                    range,
              },
            ],
          }
        },
        [
          appliedCustomTileRange,
        ]
      )

    // ============================================
    // CUSTOM DRAFT PRESET
    // ============================================

    const draftCustomPreset =
      useMemo<TilePreset>(
        () => {
          const range =
            draftCustomTileRange ||
            getRollingDateRangePST(
              7
            )

          return {
            id: 'custom',

            label:
              'Custom range',

            tiles: [
              {
                id:
                  'custom-range',

                label:
                  formatDateRangePST(
                    range.startDate,
                    range.endDate
                  ),

                apiPeriod:
                  'CUSTOM' as PeriodSummaryPeriod,

                getDateRange:
                  () =>
                    range,
              },
            ],
          }
        },
        [
          draftCustomTileRange,
        ]
      )

    // ============================================
    // CURRENT APPLIED PRESET
    // ============================================

    const currentPreset =
      useMemo(
        () =>
          appliedPresetId ===
          'custom'
            ? appliedCustomPreset
            : tilePresets.find(
                (preset) =>
                  preset.id ===
                  appliedPresetId
              ) ||
              tilePresets[0],
        [
          appliedPresetId,
          appliedCustomPreset,
        ]
      )

    // ============================================
    // CURRENT DRAFT PRESET
    // ============================================

    const currentDraftPreset =
      useMemo(
        () =>
          draftPresetId ===
          'custom'
            ? draftCustomPreset
            : tilePresets.find(
                (preset) =>
                  preset.id ===
                  draftPresetId
              ) ||
              tilePresets[0],
        [
          draftPresetId,
          draftCustomPreset,
        ]
      )

    void currentDraftPreset

    // ============================================
    // SELECT FIRST TILE WHEN APPLIED PRESET CHANGES
    // ============================================

    useEffect(() => {
      setSelectedTileId(
        currentPreset.tiles[0].id
      )
    }, [
      currentPreset,
    ])

    // ============================================
    // PROFIT SUMMARY
    // ============================================

    const {
      data: profitData,
      isFetching:
        profitFetching,
      refetch:
        refetchProfit,
    } =
      useGetProfitSummaryQuery(
        {
          accountId:
            effectiveAccountId,

          marketplaces:
            appliedMarketplaces.length
              ? appliedMarketplaces
              : ALL_MARKETPLACES,

          currency:
            appliedCurrency,

          preset:
            appliedPresetId as any,
        },
        {
          skip:
            !effectiveAccountId ||
            appliedPresetId ===
              'custom',
        }
      )

    // ============================================
    // CUSTOM PROFIT SUMMARY
    // ============================================

    const {
      data:
        customSummaryData,
      isFetching:
        customSummaryFetching,
      refetch:
        refetchCustomSummary,
    } =
      useGetProfitSummaryQuery(
        {
          accountId:
            effectiveAccountId,

          marketplaces:
            appliedMarketplaces.length
              ? appliedMarketplaces
              : ALL_MARKETPLACES,

          currency:
            appliedCurrency,

          startDate:
            appliedCustomTileRange
              ?.startDate,

          endDate:
            appliedCustomTileRange
              ?.endDate,
        } as any,
        {
          skip:
            !effectiveAccountId ||
            appliedPresetId !==
              'custom' ||
            !appliedCustomTileRange,
        }
      )

    const isFetchingActive =
      appliedPresetId ===
      'custom'
        ? customSummaryFetching
        : profitFetching

    const activeSummaryData =
      appliedPresetId ===
      'custom'
        ? customSummaryData
        : profitData

    // ============================================
    // PERIOD MAP
    // ============================================

    const periodMap =
      useMemo(() => {
        if (
          appliedPresetId ===
          'custom'
        ) {
          const map =
            new Map<
              PeriodSummaryPeriod,
              PeriodSummary
            >()

          if (
            customSummaryData
          ) {
            const raw: any =
              customSummaryData

            const single =
              Array.isArray(
                raw?.periods
              )
                ? raw.periods[0]
                : raw

            if (single) {
              map.set(
                'CUSTOM' as PeriodSummaryPeriod,
                single
              )
            }
          }

          return map
        }

        if (
          !profitData?.periods
        ) {
          return new Map<
            PeriodSummaryPeriod,
            PeriodSummary
          >()
        }

        return new Map(
          profitData.periods.map(
            (
              period: any
            ) => [
              period.period,
              period,
            ]
          )
        )
      }, [
        profitData,
        appliedPresetId,
        customSummaryData,
      ])

    // ============================================
    // TILE DETAIL DATA
    // ============================================

    const getPeriodDetailData =
      useCallback(
        (
          tileId: string
        ) => {
          const tile =
            currentPreset.tiles.find(
              (item) =>
                item.id ===
                tileId
            )

          if (!tile) {
            return undefined
          }

          const apiPeriod =
            periodMap.get(
              tile.apiPeriod
            )

          if (!apiPeriod) {
            return undefined
          }

          return {
            currency:
              apiPeriod.currency ||
              appliedCurrency,

            salesRevenue:
              Number(
                apiPeriod.salesRevenue ??
                  0
              ),

            salesCount:
              Number(
                apiPeriod.salesCount ??
                  0
              ),

            ordersUnitCount:
              Number(
                apiPeriod.ordersUnitCount ??
                  0
              ),

            totalPromo:
              Number(
                apiPeriod.totalPromo ??
                  0
              ),

            advertisingCost:
              Number(
                apiPeriod.advertisingCost ??
                  0
              ),

            advertisingDetails: {
              sponsoredProducts:
                Number(
                  apiPeriod
                    .advertisingDetails
                    ?.sponsoredProducts ??
                    0
                ),

              sponsoredBrandsVideo:
                Number(
                  apiPeriod
                    .advertisingDetails
                    ?.sponsoredBrandsVideo ??
                    0
                ),

              sponsoredDisplay:
                Number(
                  apiPeriod
                    .advertisingDetails
                    ?.sponsoredDisplay ??
                    0
                ),

              sponsoredBrands:
                Number(
                  apiPeriod
                    .advertisingDetails
                    ?.sponsoredBrands ??
                    0
                ),
            },

            totalRefunds:
              Number(
                apiPeriod.totalRefunds ??
                  0
              ),

            totalRefundsCount:
              Number(
                apiPeriod.totalRefundsCount ??
                  0
              ),

            refundCost:
              Number(
                apiPeriod.refundCost ??
                  0
              ),

            refundPercentage:
              Number(
                apiPeriod.refundPercentage ??
                  0
              ),

            refundDetails: {
              refundedAmount:
                Number(
                  apiPeriod
                    .refundDetails
                    ?.refundedAmount ??
                    0
                ),

              refundCommission:
                Number(
                  apiPeriod
                    .refundDetails
                    ?.refundCommission ??
                    0
                ),

              promotion:
                Number(
                  apiPeriod
                    .refundDetails
                    ?.promotion ??
                    0
                ),

              valueOfReturnedItems:
                Number(
                  apiPeriod
                    .refundDetails
                    ?.valueOfReturnedItems ??
                    0
                ),

              refundedReferralFee:
                Number(
                  apiPeriod
                    .refundDetails
                    ?.refundedReferralFee ??
                    0
                ),
            },

            totalFees:
              Number(
                apiPeriod.totalFees ??
                  0
              ),

            amazonFeeDetails: {
              fbaStorageFee:
                Number(
                  apiPeriod
                    .amazonFeeDetails
                    ?.fbaStorageFee ??
                    0
                ),

              fbaPerUnitFulfillmentFee:
                Number(
                  apiPeriod
                    .amazonFeeDetails
                    ?.fbaPerUnitFulfillmentFee ??
                    0
                ),

              referralFee:
                Number(
                  apiPeriod
                    .amazonFeeDetails
                    ?.referralFee ??
                    0
                ),

              dealParticipationFee:
                Number(
                  apiPeriod
                    .amazonFeeDetails
                    ?.dealParticipationFee ??
                    0
                ),

              dealPerformanceFee:
                Number(
                  apiPeriod
                    .amazonFeeDetails
                    ?.dealPerformanceFee ??
                    0
                ),

              fbaDisposalFee:
                Number(
                  apiPeriod
                    .amazonFeeDetails
                    ?.fbaDisposalFee ??
                    0
                ),

              salesTaxCollectionFee:
                Number(
                  apiPeriod
                    .amazonFeeDetails
                    ?.salesTaxCollectionFee ??
                    0
                ),

              reversalReimbursement:
                Number(
                  apiPeriod
                    .amazonFeeDetails
                    ?.reversalReimbursement ??
                    0
                ),

              other:
                Number(
                  apiPeriod
                    .amazonFeeDetails
                    ?.other ??
                    0
                ),
            },

            totalCOGS:
              Number(
                apiPeriod.totalCOGS ??
                  0
              ),

            totalExpenses:
              Number(
                apiPeriod.totalExpenses ??
                  0
              ),

            grossProfit:
              Number(
                apiPeriod.grossProfit ??
                  0
              ),

            estimatedPayout:
              Number(
                apiPeriod.estimatedPayout ??
                  0
              ),

            netProfit:
              Number(
                apiPeriod.netProfit ??
                  0
              ),

            margin:
              Number(
                apiPeriod.margin ??
                  0
              ),

            realACOS:
              Number(
                apiPeriod.realACOS ??
                  0
              ),

            roi:
              Number(
                apiPeriod.roi ??
                  0
              ),

            _apiPeriod:
              apiPeriod,
          }
        },
        [
          currentPreset,
          periodMap,
          appliedCurrency,
        ]
      )

    // ============================================
    // PERIOD CARDS
    // ============================================

    const periodCardsData =
      useMemo(() => {
        const now =
          nowInPST()

        return currentPreset.tiles.map(
          (tile) => {
            const period =
              periodMap.get(
                tile.apiPeriod
              )

            const range =
              tile.getDateRange(
                now
              )

            return {
              id: tile.id,

              label:
                tile.label,

              dateRange:
                formatDateRangePST(
                  range.startDate,
                  range.endDate
                ),

              salesRevenue:
                Number(
                  period?.salesRevenue ??
                    0
                ),

              salesCount:
                Number(
                  period?.salesCount ??
                    0
                ),

              ordersUnitCount:
                Number(
                  period?.ordersUnitCount ??
                    0
                ),

              totalFees:
                Number(
                  period?.totalFees ??
                    0
                ),

              totalRefunds:
                Number(
                  period?.totalRefunds ??
                    0
                ),

              totalRefundsCount:
                Number(
                  period?.totalRefundsCount ??
                    0
                ),

              refundCost:
                Number(
                  period?.refundCost ??
                    0
                ),

              totalCOGS:
                Number(
                  period?.totalCOGS ??
                    0
                ),

              totalExpenses:
                Number(
                  period?.totalExpenses ??
                    0
                ),

              totalPromo:
                Number(
                  period?.totalPromo ??
                    0
                ),

              advertisingCost:
                Number(
                  period?.advertisingCost ??
                    0
                ),

              grossProfit:
                Number(
                  period?.grossProfit ??
                    0
                ),

              estimatedPayout:
                Number(
                  period?.estimatedPayout ??
                    0
                ),

              netProfit:
                Number(
                  period?.netProfit ??
                    0
                ),

              margin:
                Number(
                  period?.margin ??
                    0
                ),

              realACOS:
                Number(
                  period?.realACOS ??
                    0
                ),

              roi:
                Number(
                  period?.roi ??
                    0
                ),

              refundPercentage:
                Number(
                  period?.refundPercentage ??
                    0
                ),

              isFetching:
                isFetchingActive,
            }
          }
        )
      }, [
        currentPreset,
        periodMap,
        isFetchingActive,
      ])

    // ============================================
    // SELECTED TILE
    // ============================================

    const selectedTileConfig =
      currentPreset.tiles.find(
        (tile) =>
          tile.id ===
          selectedTileId
      )

    const selectedTileRange =
      useMemo(() => {
        const now =
          nowInPST()

        return selectedTileConfig
          ? selectedTileConfig.getDateRange(
              now
            )
          : getSingleDayPST(1)
      }, [
        selectedTileConfig,
      ])

    // ============================================
    // ACTIVE RANGE
    // ============================================

    const chartRange =
      useMemo(
        () => ({
          startDate:
            dateRange.startDate,

          endDate:
            dateRange.endDate,
        }),
        [dateRange]
      )

    const activeRange =
      useMemo(() => {
        const range =
          activeTab === 'chart' ||
          activeTab === 'pnl'
            ? chartRange
            : selectedTileRange

        return {
          startDate:
            range.startDate ||
            undefined,

          endDate:
            range.endDate ||
            undefined,
        }
      }, [
        activeTab,
        chartRange,
        selectedTileRange,
      ])

    // ============================================
    // PRODUCT QUERY
    // ============================================

    const {
      data: productData,
      isFetching:
        productFetching,
    } =
      useGetProfitByProductQuery(
        {
          ...profitFilters,

          accountId:
            effectiveAccountId,

          marketplaces:
            appliedMarketplaces.length
              ? appliedMarketplaces
              : ALL_MARKETPLACES,

          currency:
            appliedCurrency,

          startDate:
            activeRange.startDate,

          endDate:
            activeRange.endDate,
        },
        {
          skip:
            !effectiveAccountId ||
            tableView ===
              'order-items',
        }
      )

    // ============================================
    // ORDER ITEMS QUERY
    // ============================================

    const {
      data: orderItemsData,
      isFetching:
        orderItemsFetching,
    } =
      useGetProfitByOrderItemsQuery(
        {
          ...profitFilters,

          accountId:
            effectiveAccountId,

          marketplaces:
            appliedMarketplaces.length
              ? appliedMarketplaces
              : ALL_MARKETPLACES,

          currency:
            appliedCurrency,

          startDate:
            activeRange.startDate,

          endDate:
            activeRange.endDate,
        },
        {
          skip:
            !effectiveAccountId ||
            tableView ===
              'products',
        }
      )

    // ============================================
    // TILE DATE PRESETS
    // ============================================

    const tileDatePresets =
      useMemo(
        () => [
          ...tilePresets.map(
            (preset) => ({
              id: preset.id,

              label:
                preset.label,

              getRange: () => {
                const now =
                  nowInPST()

                const ranges =
                  preset.tiles.map(
                    (
                      tile
                    ) =>
                      tile.getDateRange(
                        now
                      )
                  )

                const starts =
                  ranges
                    .map(
                      (
                        range
                      ) =>
                        range.startDate
                    )
                    .sort()

                const ends =
                  ranges
                    .map(
                      (
                        range
                      ) =>
                        range.endDate
                    )
                    .sort()

                return {
                  startDate:
                    starts[0],

                  endDate:
                    ends[
                      ends.length -
                        1
                    ],
                }
              },
            })
          ),

          {
            id: 'custom',

            label:
              'Custom range',

            getRange:
              () => {
                const range =
                  draftCustomTileRange ||
                  getRollingDateRangePST(
                    7
                  )

                return {
                  startDate:
                    range.startDate,

                  endDate:
                    range.endDate,
                }
              },
          },
        ],
        [
          draftCustomTileRange,
        ]
      )

    // ============================================
    // TILE DATE RANGE VALUE
    // ============================================

    const tileDateRangeValue =
      useMemo<DateRangeValue>(
        () => {
          if (
            draftPresetId ===
            'custom'
          ) {
            const range =
              draftCustomTileRange ||
              getRollingDateRangePST(
                7
              )

            return {
              startDate:
                range.startDate,

              endDate:
                range.endDate,

              presetId:
                'custom',

              periodicity:
                'day',
            }
          }

          const preset =
            tileDatePresets.find(
              (item) =>
                item.id ===
                draftPresetId
            )

          const range =
            preset?.getRange()

          return {
            startDate:
              range?.startDate ??
              null,

            endDate:
              range?.endDate ??
              null,

            presetId:
              draftPresetId,

            periodicity:
              'day',
          }
        },
        [
          draftPresetId,
          draftCustomTileRange,
          tileDatePresets,
        ]
      )

    // ============================================
    // TILE DATE RANGE CHANGE
    // ============================================

    const handleTileDateRangeChange =
      useCallback(
        (
          range: DateRangeValue
        ) => {
          /*
           * Named preset selected.
           */
          if (
            range.presetId &&
            range.presetId !==
              'custom'
          ) {
            setDraftPresetId(
              range.presetId
            )

            setDraftCustomTileRange(
              null
            )

            return
          }

          /*
           * Custom range.
           *
           * Always store the actual selected
           * dates in draft state.
           *
           * Do not depend on presetId alone because
           * the DateRangePicker can stay on "custom"
           * while the user changes the dates.
           */
          if (
            range.startDate &&
            range.endDate
          ) {
            setDraftCustomTileRange({
              startDate:
                range.startDate,

              endDate:
                range.endDate,
            })

            setDraftPresetId(
              'custom'
            )
          }
        },
        []
      )

    // ============================================
    // DRAFT MARKETPLACE CHANGE
    // ============================================

    const handleDraftMarketplacesChange =
      useCallback(
        (
          value: string[]
        ) => {
          setDraftMarketplaces(
            value
          )
        },
        []
      )

    // ============================================
    // APPLY TILE FILTERS
    // ============================================

 const handleApplyTileFilters =
  useCallback(() => {
    /*
     * IMPORTANT:
     *
     * MultiSelectInput works with MARKETPLACES[].id.
     *
     * Therefore, when the user clears every marketplace,
     * we must restore the exact same IDs that the dropdown
     * uses, rather than relying on a potentially differently
     * shaped ALL_MARKETPLACES constant.
     */
    const normalizedMarketplaces =
      draftMarketplaces.length > 0
        ? [...draftMarketplaces]
        : MARKETPLACES.map(
            (marketplace) =>
              marketplace.id
          )

    /*
     * Applied state.
     */
    setAppliedMarketplaces(
      normalizedMarketplaces
    )

    /*
     * Draft state.
     *
     * This is the important part for the UI:
     * after clicking Apply Filters with nothing selected,
     * the dropdown receives every marketplace ID again.
     */
    setDraftMarketplaces(
      normalizedMarketplaces
    )

    /*
     * Currency.
     */
    setAppliedCurrency(
      draftCurrency
    )

    /*
     * Preset.
     */
    setAppliedPresetId(
      draftPresetId
    )

    /*
     * Custom range.
     */
    setAppliedCustomTileRange(
      draftPresetId === 'custom'
        ? draftCustomTileRange
        : null
    )

    /*
     * Redux.
     *
     * Send the normalized marketplace list.
     *
     * NEVER send [] when Apply Filters is clicked.
     */
    dispatch(
      setFilters({
        ...profitFilters,
        marketplaces:
          normalizedMarketplaces,
        currency:
          draftCurrency,
      })
    )

    /*
     * Reset the date picker instance.
     */
    setTileDatePickerKey(
      (key) => key + 1
    )

    try {
      localStorage.setItem(
        PRESET_STORAGE_KEY,
        draftPresetId
      )
    } catch {
      // Ignore localStorage errors.
    }
  }, [
    draftMarketplaces,
    draftCurrency,
    draftPresetId,
    draftCustomTileRange,
    dispatch,
    profitFilters,
  ])

    // ============================================
    // RELOAD
    // ============================================

    const handleReload =
      useCallback(() => {
        if (
          appliedPresetId ===
          'custom'
        ) {
          refetchCustomSummary()
        } else {
          refetchProfit()
        }
      }, [
        appliedPresetId,
        refetchProfit,
        refetchCustomSummary,
      ])

    // ============================================
    // MARKETPLACE CHANGE FOR CHART/P&L
    // ============================================

    const handleMarketplacesChange =
  useCallback(
    (value: string[]) => {
      /*
       * For chart/P&L, clearing everything also means
       * all marketplaces.
       *
       * Use the exact IDs from MARKETPLACES because those
       * are the IDs MultiSelectInput operates on.
       */
      const marketplaces =
        value.length > 0
          ? [...value]
          : MARKETPLACES.map(
              (marketplace) =>
                marketplace.id
            )

      setAppliedMarketplaces(
        marketplaces
      )

      setDraftMarketplaces(
        marketplaces
      )

      dispatch(
        setFilters({
          ...profitFilters,
          marketplaces,
        })
      )
    },
    [
      dispatch,
      profitFilters,
    ]
  )

    // ============================================
    // CHART FILTERS
    // ============================================

    const chartFilters =
      useMemo(
        () => ({
          accountId:
            effectiveAccountId,

          marketplaces:
            appliedMarketplaces.length
              ? appliedMarketplaces
              : ALL_MARKETPLACES,

          startDate:
            dateRange.startDate,

          endDate:
            dateRange.endDate,

          period:
            (
              dateRange.periodicity ||
              'day'
            ) as ChartPeriod,

          currency:
            appliedCurrency,
        }),
        [
          effectiveAccountId,
          appliedMarketplaces,
          dateRange,
          appliedCurrency,
        ]
      )

    const {
      data: chartData,
      isFetching:
        chartFetching,
      error: chartError,
    } =
      useGetDashboardChartQuery(
        chartFilters as any,
        {
          skip:
            !effectiveAccountId ||
            activeTab !==
              'chart',
        }
      )

    // ============================================
    // P&L FILTERS
    // ============================================

    const plFilters:
      ProfitFilters =
      useMemo(
        () => ({
          accountId:
            effectiveAccountId,

          marketplaces:
            appliedMarketplaces.length
              ? appliedMarketplaces
              : ALL_MARKETPLACES,

          currency:
            appliedCurrency,

          startDate:
            dateRange.startDate ??
            undefined,

          endDate:
            dateRange.endDate ??
            undefined,

          periodicity:
            (
              dateRange.periodicity as
                | 'day'
                | 'week'
                | 'month'
            ) ??
            undefined,

          preset:
            (
              dateRange.presetId as
                | 'last-12-months'
                | 'last-3-months'
                | 'last-30-days'
                | 'custom'
            ) ??
            undefined,
        }),
        [
          effectiveAccountId,
          appliedMarketplaces,
          appliedCurrency,
          dateRange,
        ]
      )

    const {
      data: plData,
      isFetching:
        plFetching,
      error: plError,
    } =
      useGetPLByPeriodsQuery(
        plFilters,
        {
          skip:
            !effectiveAccountId ||
            activeTab !==
              'pnl',
        }
      )

    // ============================================
    // RETURN
    // ============================================

    return (
      <div className="w-full">
        <Container size="full">

          {/* ======================================== */}
          {/* CHART VIEW */}
          {/* ======================================== */}

          {activeTab ===
            'chart' && (
            <>
              <div className="bg-surface-secondary border-b border-border mb-6">
                <div className="px-6 py-4">
                  <div className="flex items-center gap-4">

                    <div className="w-[45%]">
                      <div className="relative">
                        <svg
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>

                        <Input
                          type="text"
                          placeholder="Search"
                          value={
                            searchTerm
                          }
                          onChange={(
                            e
                          ) =>
                            setSearchTerm(
                              e.target.value
                            )
                          }
                          className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-1 justify-end">

                      <div className="w-[220px] shrink-0">
                        <DateRangePicker
                          value={
                            dateRange
                          }
                          presets={
                            chartPresets
                          }
                          keepOpenPresetIds={[
                            'custom',
                          ]}
                          onChange={(
                            range
                          ) => {
                            const preset =
                              chartPresets.find(
                                (
                                  item
                                ) =>
                                  item.id ===
                                  range.presetId
                              )

                            const periodicity =
                              preset?.getRange()
                                .periodicity ||
                              inferPeriodicity(
                                range.startDate as string,
                                range.endDate as string
                              )

                            setDateRange({
                              ...range,
                              periodicity,
                            })

                            setPage(1)
                          }}
                          displayFormat="MMM d, yyyy"
                          placeholder="Select date range"
                        />
                      </div>

                      <div className="min-w-[160px] shrink-0">
                        <MultiSelectInput
                          title="Marketplace"
                          options={
                            MARKETPLACES
                          }
                          value={
                            appliedMarketplaces
                          }
                          onChange={
                            handleMarketplacesChange
                          }
                        />
                      </div>

                      <div className="min-w-[100px] shrink-0">
                        <Select
                          value={
                            appliedCurrency
                          }
                          onChange={(
                            e
                          ) => {
                            const currency =
                              e.target
                                .value as CurrencyCode

                            setAppliedCurrency(
                              currency
                            )

                            dispatch(
                              setFilters({
                                ...profitFilters,
                                currency,
                              })
                            )
                          }}
                          options={[
                            {
                              value:
                                'CAD',
                              label:
                                'CAD',
                            },
                            {
                              value:
                                'USD',
                              label:
                                'USD',
                            },
                            {
                              value:
                                'EUR',
                              label:
                                'EUR',
                            },
                          ]}
                        />
                      </div>

                      <Button
                        variant="ghost"
                        onClick={
                          handleReload
                        }
                        className="bg-surface border border-border hover:bg-surface-tertiary text-text-primary"
                        title="Reload data"
                      >
                        ↻
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6"
                style={{
                  gridAutoRows:
                    '1fr',
                }}
              >
                <div className="lg:col-span-2 h-full">
                  <DashboardChart
                    data={
                      chartData
                    }
                    isLoading={
                      chartFetching
                    }
                    error={
                      chartError
                    }
                    currency={
                      appliedCurrency
                    }
                  />
                </div>

                <div className="lg:col-span-1 h-full">
                  <ChartSummaryTable
                    data={
                      chartData?.summary
                    }
                    isLoading={
                      chartFetching
                    }
                    currency={
                      appliedCurrency
                    }
                    startDate={
                      chartData?.startDate ||
                      ''
                    }
                    endDate={
                      chartData?.endDate ||
                      ''
                    }
                  />
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-border flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                      <h2 className="text-lg font-semibold text-text-primary">
                        All Periods
                      </h2>

                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setTableView(
                              'products'
                            )
                          }
                          className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                            tableView ===
                            'products'
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
                    {tableView ===
                    'products' ? (
                      <SellerboardProductsTable
                        products={
                          productData
                        }
                        isLoading={
                          productFetching
                        }
                        isFetching={
                          productFetching
                        }
                        searchTerm={
                          debouncedSearchTerm
                        }
                      />
                    ) : (
                      <OrderItemsTable
                        orderItems={
                          orderItemsData
                        }
                        isLoading={
                          orderItemsFetching
                        }
                        searchTerm={
                          debouncedSearchTerm
                        }
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ======================================== */}
          {/* TILES VIEW */}
          {/* ======================================== */}

          {activeTab ===
            'tiles' && (
            <>
              {isFetchingActive && (
                <div className="bg-surface-secondary border border-border rounded-xl p-6 mb-6 animate-pulse">
                  <div className="h-6 bg-border rounded w-1/3 mb-4" />

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                    {[
                      ...Array(4),
                    ].map(
                      (_, index) => (
                        <div
                          key={
                            index
                          }
                          className="h-8 bg-border rounded"
                        />
                      )
                    )}
                  </div>
                </div>
              )}

              {activeSummaryData?.summary &&
                !isFetchingActive && (
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white mb-6">

                    <h2 className="text-lg font-semibold mb-4">
                      Profit Overview (
                      {
                        currentPreset.label
                      }
                      )
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                      <div>
                        <div className="text-3xl font-bold">
                          {formatCurrency(
                            activeSummaryData
                              .summary
                              .totalRevenue
                          )}
                        </div>

                        <div className="text-blue-100 text-sm">
                          Total Revenue
                        </div>
                      </div>

                      <div>
                        <div
                          className={`text-3xl font-bold ${
                            activeSummaryData
                              .summary
                              .totalProfit >=
                            0
                              ? 'text-green-300'
                              : 'text-red-300'
                          }`}
                        >
                          {formatCurrency(
                            activeSummaryData
                              .summary
                              .totalProfit
                          )}
                        </div>

                        <div className="text-blue-100 text-sm">
                          Total Net Profit
                        </div>
                      </div>

                      <div>
                        <div className="text-3xl font-bold">
                          {
                            activeSummaryData
                              .summary
                              .totalOrders
                          }
                        </div>

                        <div className="text-blue-100 text-sm">
                          Total Orders
                        </div>
                      </div>

                      <div>
                        <div className="text-3xl font-bold">
                          {
                            activeSummaryData
                              .summary
                              .totalUnits
                          }
                        </div>

                        <div className="text-blue-100 text-sm">
                          Total Units
                        </div>
                      </div>

                    </div>
                  </div>
                )}

              {/* ====================================== */}
              {/* TILES HEADER */}
              {/* ====================================== */}

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
                onMarketplacesChange={handleDraftMarketplacesChange}
                currency={draftCurrency}
                onCurrencyChange={(value) =>
                  setDraftCurrency(value as CurrencyCode)
                }
                currencyOptions={[
                  { value: 'CAD', label: 'CAD' },
                  { value: 'USD', label: 'USD' },
                  { value: 'EUR', label: 'EUR' },
                ]}
                onFilter={handleApplyTileFilters}
                searchWidth="w-[55%]"
                datePickerKey={tileDatePickerKey}
              />

              {/* ====================================== */}
              {/* PERIOD CARDS */}
              {/* ====================================== */}

              <div
                className={
                  appliedPresetId ===
                  'custom'
                    ? 'grid grid-cols-1 gap-4 mb-6 max-w-md'
                    : `grid grid-cols-1 md:grid-cols-2 ${
                        gridColsClass[
                          Math.min(
                            currentPreset
                              .tiles
                              .length,
                            5
                          )
                        ]
                      } gap-4 mb-6`
                }
              >
                {periodCardsData.map(
                  (period) => {
                    if (
                      period.isFetching
                    ) {
                      return (
                        <Card
                          key={
                            period.id
                          }
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
                        key={
                          period.id
                        }
                        className={`bg-surface border border-border cursor-pointer transition-shadow hover:shadow-md min-h-[400px] min-w-0 flex flex-col ${
                          selectedTileId ===
                          period.id
                            ? 'ring-2 ring-primary-200'
                            : ''
                        }`}
                        onClick={() =>
                          setSelectedTileId(
                            period.id
                          )
                        }
                      >
                        <CardContent className="p-4 break-words min-w-0 flex-1 flex flex-col">
                          <SummaryTiles
                            setSelectedPeriodForDetails={
                              setSelectedPeriodForDetails
                            }
                            period={
                              period
                            }
                          />
                        </CardContent>
                      </Card>
                    )
                  }
                )}
              </div>

              {/* ====================================== */}
              {/* TILES TABLE */}
              {/* ====================================== */}

              <Card>
                <CardContent className="p-0">

                  <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-border flex-wrap gap-3">

                    <div className="flex items-center gap-4">

                      <h2 className="text-lg font-semibold text-text-primary">
                        {
                          selectedTileConfig
                            ?.label ||
                          'Period'
                        }
                      </h2>

                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setTableView(
                              'products'
                            )
                          }
                          className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                            tableView ===
                            'products'
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
                    {tableView ===
                    'products' ? (
                      <SellerboardProductsTable
                        products={
                          productData as any
                        }
                        isLoading={
                          productFetching
                        }
                        isFetching={
                          productFetching
                        }
                        searchTerm={
                          debouncedSearchTerm
                        }
                      />
                    ) : (
                      <OrderItemsTable
                        orderItems={
                          orderItemsData
                        }
                        isLoading={
                          orderItemsFetching
                        }
                        searchTerm={
                          debouncedSearchTerm
                        }
                      />
                    )}
                  </div>

                </CardContent>
              </Card>
            </>
          )}

          {/* ======================================== */}
          {/* P&L VIEW */}
          {/* ======================================== */}

          {activeTab ===
            'pnl' && (
            <>
              <div className="bg-surface-secondary border-b border-border mb-6">
                <div className="px-6 py-4">

                  <div className="flex items-center gap-4">

                    <div className="basis-[50%] min-w-0">
                      <div className="relative">

                        <svg
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>

                        <input
                          type="text"
                          placeholder="Search"
                          value={
                            searchTerm
                          }
                          onChange={(
                            e
                          ) =>
                            setSearchTerm(
                              e.target.value
                            )
                          }
                          className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600"
                        />

                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-1 justify-end">

                      <div className="shrink-0">
                        <DateRangePicker
                          value={
                            dateRange
                          }
                          presets={
                            chartPresets
                          }
                          keepOpenPresetIds={[
                            'custom',
                          ]}
                          onChange={(
                            range
                          ) => {
                            const preset =
                              chartPresets.find(
                                (
                                  item
                                ) =>
                                  item.id ===
                                  range.presetId
                              )

                            const periodicity =
                              preset?.getRange()
                                .periodicity ||
                              inferPeriodicity(
                                range.startDate as string,
                                range.endDate as string
                              )

                            setDateRange({
                              ...range,
                              periodicity,
                            })
                          }}
                          displayFormat="MMM d, yyyy"
                          placeholder="Select date range"
                        />
                      </div>

                      <div className="min-w-[160px] shrink-0">
                        <MultiSelectInput
                          title="Marketplace"
                          options={
                            MARKETPLACES
                          }
                          value={
                            appliedMarketplaces
                          }
                          onChange={
                            handleMarketplacesChange
                          }
                        />
                      </div>

                      <div className="min-w-[100px] shrink-0">
                        <Select
                          value={
                            appliedCurrency
                          }
                          onChange={(
                            e
                          ) => {
                            const currency =
                              e.target
                                .value as CurrencyCode

                            setAppliedCurrency(
                              currency
                            )

                            dispatch(
                              setFilters({
                                ...profitFilters,
                                currency,
                              })
                            )
                          }}
                          options={[
                            {
                              value:
                                'CAD',
                              label:
                                'CAD',
                            },
                            {
                              value:
                                'USD',
                              label:
                                'USD',
                            },
                            {
                              value:
                                'EUR',
                              label:
                                'EUR',
                            },
                          ]}
                        />
                      </div>

                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <PLTable
                  data={
                    plData
                  }
                  isLoading={
                    plFetching
                  }
                  error={
                    plError
                  }
                  currency={
                    appliedCurrency
                  }
                />
              </div>

              <Card>
                <CardContent className="p-0">

                  <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-border flex-wrap gap-3">

                    <div className="flex items-center gap-4">

                      <h2 className="text-lg font-semibold text-text-primary">
                        {
                          selectedTileConfig
                            ?.label ||
                          'Period'
                        }
                      </h2>

                      <div className="flex gap-2">

                        <button
                          onClick={() =>
                            setTableView(
                              'products'
                            )
                          }
                          className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                            tableView ===
                            'products'
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

                    {tableView ===
                    'products' ? (
                      <SellerboardProductsTable
                        products={
                          productData
                        }
                        isLoading={
                          productFetching
                        }
                        isFetching={
                          productFetching
                        }
                        searchTerm={
                          debouncedSearchTerm
                        }
                      />
                    ) : (
                      <OrderItemsTable
                        orderItems={
                          orderItemsData
                        }
                        isLoading={
                          orderItemsFetching
                        }
                        searchTerm={
                          debouncedSearchTerm
                        }
                      />
                    )}

                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ======================================== */}
          {/* MAP */}
          {/* ======================================== */}

          {activeTab ===
            'map' && (
            <MapComponent
              accountId={
                effectiveAccountId
              }
            />
          )}

          {/* ======================================== */}
          {/* TRENDS */}
          {/* ======================================== */}

          {activeTab ===
            'trends' && (
            <TrendsComponent
              accountId={
                effectiveAccountId
              }
              marketplaces={
                appliedMarketplaces
              }
              currency={
                appliedCurrency
              }
            />
          )}

          {/* ======================================== */}
          {/* TILE DETAILS MODAL */}
          {/* ======================================== */}

          {selectedPeriodForDetails && (
            <TileDetailsModal
              isOpen={
                !!selectedPeriodForDetails
              }

              onClose={() =>
                setSelectedPeriodForDetails(
                  null
                )
              }

              periodLabel={
                periodCardsData.find(
                  (
                    period
                  ) =>
                    period.id ===
                    selectedPeriodForDetails
                )?.label ||
                ''
              }

              dateRange={
                periodCardsData.find(
                  (
                    period
                  ) =>
                    period.id ===
                    selectedPeriodForDetails
                )?.dateRange ||
                ''
              }

              data={getPeriodDetailData(
                selectedPeriodForDetails
              )}

              currency={
                appliedCurrency
              }
            />
          )}

        </Container>
      </div>
    )
  }

export default ProfitDashboardScreen