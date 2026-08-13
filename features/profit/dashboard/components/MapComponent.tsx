'use client'

import React, {
  useMemo,
  useState,
} from 'react'

import {
  Card,
  CardContent,
} from '@/design-system/cards'

import { Spinner } from '@/design-system/loaders'

import {
  Select,
  Input,
} from '@/design-system/inputs'

import {
  useGetProfitByCountryQuery,
  ProfitFilters,
  CountryProfitBreakdown,
} from '@/services/api/profit.api'

import { ErrorComponent } from './ErrorComponent'

import {
  RegionsTable,
} from './RegionsTable'

import { LeafletMap } from './LeafletMap'

import { TileDetailsModal } from './TileDetailsModal'

import { cn } from '@/utils/cn'

import DateRangePicker, {
  DateRangeValue,
} from '@/components/date-range-picker/DateRangePicker'

import {
  format,
  addDays,
  addMonths,
} from 'date-fns'

import {
  toZonedTime,
} from 'date-fns-tz'

const TIMEZONE =
  'America/Los_Angeles'

const nowInPST = () =>
  toZonedTime(
    new Date(),
    TIMEZONE
  )

const toISODatePST = (
  date: Date
) =>
  format(
    date,
    'yyyy-MM-dd'
  )

const chartPresets = [
  {
    id: 'last-12-months',
    label: 'Last 12 months',

    getRange: () => {
      const end =
        nowInPST()

      const start =
        addMonths(
          end,
          -12
        )

      return {
        startDate:
          toISODatePST(start),

        endDate:
          toISODatePST(end),

        periodicity:
          'month',
      }
    },
  },

  {
    id: 'last-3-months',
    label: 'Last 3 months',

    getRange: () => {
      const end =
        nowInPST()

      const start =
        addMonths(
          end,
          -3
        )

      return {
        startDate:
          toISODatePST(start),

        endDate:
          toISODatePST(end),

        periodicity:
          'week',
      }
    },
  },

  {
    id: 'last-30-days',
    label: 'Last 30 days',

    getRange: () => {
      const end =
        nowInPST()

      const start =
        addDays(
          end,
          -29
        )

      return {
        startDate:
          toISODatePST(start),

        endDate:
          toISODatePST(end),

        periodicity:
          'day',
      }
    },
  },

  {
    id: 'custom',
    label: 'Custom range',

    getRange: () => ({
      startDate:
        toISODatePST(
          addDays(
            nowInPST(),
            -29
          )
        ),

      endDate:
        toISODatePST(
          nowInPST()
        ),

      periodicity:
        'day',
    }),
  },
]

const inferPeriodicity = (
  startDate: string,
  endDate: string
): 'day' | 'week' | 'month' => {
  const start =
    new Date(startDate)

  const end =
    new Date(endDate)

  const daysDiff =
    Math.ceil(
      (
        end.getTime() -
        start.getTime()
      ) /
        (
          1000 *
          60 *
          60 *
          24
        )
    )

  if (daysDiff <= 31) {
    return 'day'
  }

  if (daysDiff <= 90) {
    return 'week'
  }

  return 'month'
}

const getCountryName = (
  code: string
): string => {
  const nameMap: Record<
    string,
    string
  > = {
    US: 'United States',
    CA: 'Canada',
    GB: 'United Kingdom',
    DE: 'Germany',
    FR: 'France',
    IT: 'Italy',
    ES: 'Spain',
    JP: 'Japan',
    AU: 'Australia',
    IN: 'India',
    BR: 'Brazil',
    MX: 'Mexico',
  }

  return (
    nameMap[code] ||
    code
  )
}

export interface MapComponentProps {
  accountId?: string
  amazonAccountId?: string
  className?: string
}

export const MapComponent:
  React.FC<
    MapComponentProps
  > = ({
    accountId,
    amazonAccountId,
    className,
  }) => {
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
            addDays(
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
      searchTerm,
      setSearchTerm,
    ] =
      useState('')

    const [
      viewMode,
      setViewMode,
    ] =
      useState<
        'sales' | 'stock'
      >('sales')

    const [
      selectedMarketplaces,
      setSelectedMarketplaces,
    ] =
      useState<string[]>([
        'Amazon.ca',
      ])

    const [
      currency,
      setCurrency,
    ] =
      useState('CAD')

    /**
     * This state controls ONLY the TileDetailsModal.
     *
     * It is intentionally not connected to the LeafletMap.
     *
     * Clicking a country on the map continues to use the
     * Leaflet popup from LeafletMap.tsx.
     *
     * The listing/table's "More" button should call:
     *
     * setSelectedPeriodForDetails(countryId)
     */
    const [
      selectedPeriodForDetails,
      setSelectedPeriodForDetails,
    ] =
      useState<
        string | null
      >(null)

    const filters:
      ProfitFilters =
      useMemo(
        () => ({
          startDate:
            dateRange.startDate as string,

          endDate:
            dateRange.endDate as string,

          preset:
            dateRange.presetId as any,

          periodicity:
            dateRange.periodicity as any,

          accountId,

          amazonAccountId,

          marketplaces:
            selectedMarketplaces,

          currency,
        }),
        [
          dateRange,
          accountId,
          amazonAccountId,
          selectedMarketplaces,
          currency,
        ]
      )

    const {
      data: countryData,
      isLoading,
      isFetching,
      isError,
      error,
      refetch,
    } =
      useGetProfitByCountryQuery(
        filters,
        {
          skip:
            !dateRange.startDate ||
            !dateRange.endDate,
        }
      )

    // ==========================================================
    // COUNTRY AGGREGATION
    // ==========================================================

    const countryAggregates =
  useMemo(() => {
    if (!countryData) {
      return []
    }

    const map =
      new Map<
        string,
        CountryProfitBreakdown
      >()

    for (const item of countryData) {
      const existing =
        map.get(item.country)

      if (!existing) {
        map.set(
          item.country,
          {
            ...item,

            region:
              getCountryName(
                item.country
              ),

            amazonFeeDetails: {
              ...(item.amazonFeeDetails || {}),
            },

            refundDetails: {
              ...(item.refundDetails || {}),
            },

            advertisingDetails: {
              ...(item.advertisingDetails || {}),
            },
          }
        )

        continue
      }

      // ========================================================
      // BASIC
      // ========================================================

      existing.profit +=
        Number(item.profit || 0)

      existing.orders +=
        Number(item.orders || 0)

      existing.unitsSold +=
        Number(item.unitsSold || 0)

      existing.sales +=
        Number(item.sales || 0)

      existing.totalFees +=
        Number(item.amazonFees || 0)

      existing.totalCOGS +=
        Number(item.costOfGoods || 0)

      existing.refundCost +=
        Number(item.refundCost || 0)

      existing.grossProfit +=
        Number(item.grossProfit || 0)

      existing.netProfit +=
        Number(item.netProfit || 0)

      existing.estimatedPayout =
        Number(
          existing.estimatedPayout || 0
        ) +
        Number(
          item.estimatedPayout || 0
        )

      existing.totalExpenses +=
        Number(
          item.indirectExpenses || 0
        )

      existing.totalPromo +=
        Number(
          item.promoRebates || 0
        )

      existing.sellingFees +=
        Number(
          item.sellingFees || 0
        )

      existing.fbaFees +=
        Number(
          item.fbaFees || 0
        )

      existing.otherAmazonAdj +=
        Number(
          item.otherAmazonAdj || 0
        )

      existing.sellableReturns +=
        Number(
          item.sellableReturns || 0
        )

      existing.totalReturns +=
        Number(
          item.totalReturns || 0
        )

      existing.refundedUnits =
        Number(
          existing.refundedUnits || 0
        ) +
        Number(
          item.refundedUnits || 0
        )

      existing.totalRefunds =
        Number(
          existing.totalRefunds || 0
        ) +
        Number(
          item.totalRefunds || 0
        )

      existing.totalRefundsCount =
        Number(
          existing.totalRefundsCount || 0
        ) +
        Number(
          item.totalRefundsCount || 0
        )

      existing.totalExpenses =
        Number(
          existing.totalExpenses || 0
        ) +
        Number(
          item.totalExpenses || 0
        )

      // ========================================================
      // AMAZON FEE DETAILS
      // ========================================================

      const feeDetails =
        item.amazonFeeDetails || {}

      const existingFeeDetails =
        existing.amazonFeeDetails ||
        {}

      existing.amazonFeeDetails = {
        ...existingFeeDetails,

        fbaStorageFee:
          Number(
            existingFeeDetails
              .fbaStorageFee || 0
          ) +
          Number(
            feeDetails
              .fbaStorageFee || 0
          ),

        fbaPerUnitFulfillmentFee:
          Number(
            existingFeeDetails
              .fbaPerUnitFulfillmentFee || 0
          ) +
          Number(
            feeDetails
              .fbaPerUnitFulfillmentFee || 0
          ),

        referralFee:
          Number(
            existingFeeDetails
              .referralFee || 0
          ) +
          Number(
            feeDetails
              .referralFee || 0
          ),

        dealParticipationFee:
          Number(
            existingFeeDetails
              .dealParticipationFee || 0
          ) +
          Number(
            feeDetails
              .dealParticipationFee || 0
          ),

        dealPerformanceFee:
          Number(
            existingFeeDetails
              .dealPerformanceFee || 0
          ) +
          Number(
            feeDetails
              .dealPerformanceFee || 0
          ),

        fbaDisposalFee:
          Number(
            existingFeeDetails
              .fbaDisposalFee || 0
          ) +
          Number(
            feeDetails
              .fbaDisposalFee || 0
          ),

        salesTaxCollectionFee:
          Number(
            existingFeeDetails
              .salesTaxCollectionFee || 0
          ) +
          Number(
            feeDetails
              .salesTaxCollectionFee || 0
          ),

        reversalReimbursement:
          Number(
            existingFeeDetails
              .reversalReimbursement || 0
          ) +
          Number(
            feeDetails
              .reversalReimbursement || 0
          ),

        other:
          Number(
            existingFeeDetails
              .other || 0
          ) +
          Number(
            feeDetails
              .other || 0
          ),
      }

      // ========================================================
      // REFUND DETAILS
      // ========================================================

      const refundDetails =
        item.refundDetails || {}

      const existingRefundDetails =
        existing.refundDetails ||
        {}

      existing.refundDetails = {
        ...existingRefundDetails,

        refundedAmount:
          Number(
            existingRefundDetails
              .refundedAmount || 0
          ) +
          Number(
            refundDetails
              .refundedAmount || 0
          ),

        refundCommission:
          Number(
            existingRefundDetails
              .refundCommission || 0
          ) +
          Number(
            refundDetails
              .refundCommission || 0
          ),

        promotion:
          Number(
            existingRefundDetails
              .promotion || 0
          ) +
          Number(
            refundDetails
              .promotion || 0
          ),

        valueOfReturnedItems:
          Number(
            existingRefundDetails
              .valueOfReturnedItems || 0
          ) +
          Number(
            refundDetails
              .valueOfReturnedItems || 0
          ),

        refundedReferralFee:
          Number(
            existingRefundDetails
              .refundedReferralFee || 0
          ) +
          Number(
            refundDetails
              .refundedReferralFee || 0
          ),
      }

      // ========================================================
      // ADVERTISING DETAILS
      // ========================================================

      const advertisingDetails =
        item.advertisingDetails || {}

      const existingAdvertisingDetails =
        existing.advertisingDetails ||
        {}

      existing.advertisingCost =
        Number(
          existing.advertisingCost || 0
        ) +
        Number(
          item.advertisingCost || 0
        )

      existing.advertisingDetails = {
        ...existingAdvertisingDetails,

        sponsoredProducts:
          Number(
            existingAdvertisingDetails
              .sponsoredProducts || 0
          ) +
          Number(
            advertisingDetails
              .sponsoredProducts || 0
          ),

        sponsoredBrandsVideo:
          Number(
            existingAdvertisingDetails
              .sponsoredBrandsVideo || 0
          ) +
          Number(
            advertisingDetails
              .sponsoredBrandsVideo || 0
          ),

        sponsoredDisplay:
          Number(
            existingAdvertisingDetails
              .sponsoredDisplay || 0
          ) +
          Number(
            advertisingDetails
              .sponsoredDisplay || 0
          ),

        sponsoredBrands:
          Number(
            existingAdvertisingDetails
              .sponsoredBrands || 0
          ) +
          Number(
            advertisingDetails
              .sponsoredBrands || 0
          ),
      }
    }

    // ==========================================================
    // RECALCULATE COUNTRY METRICS
    // ==========================================================

    for (const country of map.values()) {
      const sales =
        Number(country.sales || 0)

      const netProfit =
        Number(country.netProfit || 0)

      const cogs =
        Math.abs(
          Number(
            country.costOfGoods || 0
          )
        )

      const advertisingCost =
        Number(
          country.advertisingCost || 0
        )

      country.refundPercentage =
        Number(
          (
            country.unitsSold > 0
              ? (
                  Number(
                    country.refundedUnits || 0
                  ) /
                  country.unitsSold
                ) *
                100
              : 0
          ).toFixed(2)
        )

      country.margin =
        Number(
          (
            sales > 0
              ? (
                  netProfit /
                  sales
                ) *
                100
              : 0
          ).toFixed(2)
        )

      country.roi =
        Number(
          (
            cogs > 0
              ? (
                  netProfit /
                  cogs
                ) *
                100
              : 0
          ).toFixed(2)
        )

      country.realACOS =
        Number(
          (
            sales > 0
              ? (
                  advertisingCost /
                  sales
                ) *
                100
              : 0
          ).toFixed(2)
        )
    }

    return Array.from(
      map.values()
    )
  }, [countryData])

    // ==========================================================
    // MAP DATA
    // ==========================================================

    const countryDataForMap =
      useMemo(() => {
        return countryAggregates.map(
          item => ({
            country:
              item.country,

            profit:
              item.profit,

            orders:
              item.orders,

            unitsSold:
              item.unitsSold ||
              item.orders,
          })
        )
      }, [countryAggregates])

    // ==========================================================
    // TABLE DATA
    // ==========================================================

    const regionData =
      useMemo(() => {
        if (!countryData) {
          return []
        }

        return countryData.map(
          item => ({
            ...item,

            region:
              item.region ||
              getCountryName(
                item.country
              ),

            grossProfit:
              item.grossProfit ??
              item.profit,

            isExpandable:
              false,
          })
        )
      }, [countryData])

    // ==========================================================
    // TILE DETAILS MODAL DATA
    // ==========================================================

    /**
     * Each country acts as the "tile" for TileDetailsModal.
     *
     * This data is only used when the More button from the
     * listing opens the modal.
     */
    const periodCardsData =
      useMemo(() => {
        return countryAggregates.map(
          country => ({
            id:
              country.country,

            label:
              country.region ||
              getCountryName(
                country.country
              ),

            dateRange:
              `${format(
                new Date(
                  `${dateRange.startDate}T00:00:00`
                ),
                'MMM d, yyyy'
              )} - ${format(
                new Date(
                  `${dateRange.endDate}T00:00:00`
                ),
                'MMM d, yyyy'
              )}`,
          })
        )
      }, [
        countryAggregates,
        dateRange.startDate,
        dateRange.endDate,
      ])

    const getPeriodDetailData = (
      tileId:
        | string
        | null
    ) => {
      if (!tileId) {
        return null
      }

      const country =
        countryAggregates.find(
          item =>
            item.country ===
            tileId
        )

      if (!country) {
        return null
      }

      const advertising =
        (country as any)
          .advertisingDetails ||
        {}

      const refundDetails =
        (country as any)
          .refundDetails ||
        {}

      const amazonFeeDetails =
        (country as any)
          .amazonFeeDetails ||
        {}

      const advertisingCost =
        Number(
          (country as any)
            .advertisingCost ||
          0
        )

      const totalRefunds =
        Number(
          (country as any)
            .totalRefunds ??
          country.refundCost ??
          0
        )

      const totalRefundsCount =
      Number(
        (country as any)
          .totalRefundsCount ??
        0
      )

      return {
        currency,

        salesRevenue:
          Number(
            country.sales || 0
          ),

        ordersUnitCount:
          Number(
            country.unitsSold || 0
          ),

        orders:
          Number(
            country.orders || 0
          ),

        totalPromo:
          Number(
            country.promoRebates ||
            0
          ),

        advertisingCost,
        estimatedPayout: Number(
          country.estimatedPayout || 0
        ),

        advertisingDetails: {
          sponsoredProducts:
            Number(
              advertising
                .sponsoredProducts ||
              0
            ),

          sponsoredBrandsVideo:
            Number(
              advertising
                .sponsoredBrandsVideo ||
              0
            ),

          sponsoredDisplay:
            Number(
              advertising
                .sponsoredDisplay ||
              0
            ),

          sponsoredBrands:
            Number(
              advertising
                .sponsoredBrands ||
              0
            ),
        },

        totalRefunds,

        totalRefundsCount,

        refundCost:
          Number(
            country.refundCost ||
            0
          ),

        refundDetails: {
          refundedAmount:
            Number(
              refundDetails
                .refundedAmount ||
              0
            ),

          refundCommission:
            Number(
              refundDetails
                .refundCommission ||
              0
            ),

          promotion:
            Number(
              refundDetails
                .promotion ||
              0
            ),

          valueOfReturnedItems:
            Number(
              refundDetails
                .valueOfReturnedItems ||
              0
            ),

          refundedReferralFee:
            Number(
              refundDetails
                .refundedReferralFee ||
              0
            ),
        },
        refundPercentage: Number(
          country.refundPercentage || 0
        ),
        totalFees:
          Number(
            country.amazonFees ||
            0
          ),

        amazonFeeDetails: {
          fbaStorageFee:
            Number(
              amazonFeeDetails
                .fbaStorageFee ||
              0
            ),

          fbaPerUnitFulfillmentFee:
            Number(
              amazonFeeDetails
                .fbaPerUnitFulfillmentFee ||
              0
            ),

          referralFee:
            Number(
              amazonFeeDetails
                .referralFee ||
              0
            ),

          dealParticipationFee:
            Number(
              amazonFeeDetails
                .dealParticipationFee ||
              0
            ),

          dealPerformanceFee:
            Number(
              amazonFeeDetails
                .dealPerformanceFee ||
              0
            ),

          fbaDisposalFee:
            Number(
              amazonFeeDetails
                .fbaDisposalFee ||
              0
            ),

          salesTaxCollectionFee:
            Number(
              amazonFeeDetails
                .salesTaxCollectionFee ||
              0
            ),

          reversalReimbursement:
            Number(
              amazonFeeDetails
                .reversalReimbursement ||
              0
            ),

          other:
            Number(
              amazonFeeDetails
                .other ||
              0
            ),
        },

        totalCOGS:
          Number(
            country.costOfGoods ||
            0
          ),

        expenses:
          Number(
            (country as any)
              .expenses ||
            0
          ),

        indirectExpenses:
          Number(
            country.indirectExpenses ||
            0
          ),

        grossProfit:
          Number(
            country.grossProfit ||
            0
          ),

        netProfit:
          Number(
            country.netProfit ||
            0
          ),

        profit:
          Number(
            country.profit ||
            0
          ),

        margin:
          Number(
            (country as any)
              .margin ||
            0
          ),

        realACOS:
          advertisingCost > 0 &&
          Number(
            country.sales || 0
          ) > 0
            ? (
                advertisingCost /
                Number(
                  country.sales
                )
              ) *
              100
            : 0,

        roi:
          Number(
            (country as any)
              .roi ||
            0
          ),

        refundedUnits:
          Number(
            (country as any)
              .refundedUnits ||
            0
          ),

        sellableReturns:
          Number(
            country.sellableReturns ||
            0
          ),

        sellableReturnsPercent:
          Number(
            (country as any)
              .sellableReturnsPercent ||
            0
          ),

        totalReturns:
          Number(
            country.totalReturns ||
            0
          ),

        sellingFees:
          Number(
            country.sellingFees ||
            0
          ),

        fbaFees:
          Number(
            country.fbaFees ||
            0
          ),

        otherAmazonAdj:
          Number(
            country.otherAmazonAdj ||
            0
          ),

        _country:
          country.country,
      }
    }

    // ==========================================================
    // OPEN TILE DETAILS
    // ==========================================================

    /**
     * This is the handler that should be passed to the listing's
     * "More" button.
     *
     * RegionsTable needs to invoke this with the country id.
     *
     * Example:
     *
     * onMore={(country) =>
     *   setSelectedPeriodForDetails(country.country)
     * }
     */
    const handleTileDetails = (
      countryId: string
    ) => {
      setSelectedPeriodForDetails(
        countryId
      )
    }

    // ==========================================================
    // RENDER
    // ==========================================================

    return (
      <div
        className={cn(
          'w-full space-y-6',
          className
        )}
      >
        {/* ======================================================
            FILTERS
        ====================================================== */}

        <div className="bg-surface-secondary border-b border-border">
          <div className="px-6 py-4">
            <div className="flex items-center gap-4 flex-wrap">

              <div className="flex-1">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
                    Q
                  </span>

                  <Input
                    type="text"
                    placeholder="Search"
                    value={
                      searchTerm
                    }
                    onChange={e =>
                      setSearchTerm(
                        e.target.value
                      )
                    }
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 bg-surface border border-border rounded-lg p-1">
                <button
                  onClick={() =>
                    setViewMode(
                      'sales'
                    )
                  }
                  className={cn(
                    'px-4 py-1.5 text-sm font-medium rounded transition-colors',
                    viewMode ===
                      'sales'
                      ? 'bg-primary-600 text-white'
                      : 'text-text-muted hover:text-text-primary'
                  )}
                >
                  Sales
                </button>

                <button
                  onClick={() =>
                    setViewMode(
                      'stock'
                    )
                  }
                  className={cn(
                    'px-4 py-1.5 text-sm font-medium rounded transition-colors',
                    viewMode ===
                      'stock'
                      ? 'bg-primary-600 text-white'
                      : 'text-text-muted hover:text-text-primary'
                  )}
                >
                  Stock
                </button>
              </div>

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
                onChange={
                  range => {
                    const preset =
                      chartPresets.find(
                        p =>
                          p.id ===
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
                  }
                }
                displayFormat="MMM d, yyyy"
                placeholder="Select date range"
              />

              <Select
                value={
                  currency
                }
                onChange={e =>
                  setCurrency(
                    e.target.value
                  )
                }
                options={[
                  {
                    value: 'CAD',
                    label: 'CAD',
                  },
                  {
                    value: 'USD',
                    label: 'USD',
                  },
                  {
                    value: 'EUR',
                    label: 'EUR',
                  },
                ]}
              />
            </div>
          </div>
        </div>

        {/* ======================================================
            MAP
        ====================================================== */}

        <Card>
          <CardContent className="p-0">
            <div className="relative w-full h-[500px] bg-surface-tertiary">

              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3">
                    <Spinner size="lg" />

                    <p className="text-sm text-text-secondary">
                      Loading map...
                    </p>
                  </div>
                </div>
              ) : isError ? (
                <div className="flex items-center justify-center h-full">
                  <ErrorComponent
                    error={error}
                    onRetry={() =>
                      refetch()
                    }
                  />
                </div>
              ) : countryDataForMap.length > 0 ? (
                <LeafletMap
                  data={
                    countryDataForMap as any
                  }

                  /*
                   * IMPORTANT:
                   * Do NOT open TileDetailsModal from here.
                   *
                   * LeafletMap owns the country popup which shows
                   * Profit and Orders when a country is clicked.
                   */
                  onCountryClick={() => {
                    // Intentionally left alone.
                    // LeafletMap handles its own popup.
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-text-secondary mb-2">
                      No data available
                    </p>

                    <p className="text-sm text-text-muted">
                      Try adjusting the date range or filters
                    </p>
                  </div>
                </div>
              )}

              {isFetching &&
                !isLoading && (
                  <div className="absolute top-3 right-3 bg-surface border border-border rounded-lg px-3 py-2 shadow-sm">
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                      <Spinner size="sm" />
                      Updating...
                    </div>
                  </div>
                )}
            </div>
          </CardContent>
        </Card>

        {/* ======================================================
            REGIONS
        ====================================================== */}

        <Card>
          <CardContent className="p-0">

            <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-border">

              <h2 className="text-lg font-semibold text-text-primary">
                All regions
              </h2>

              <div className="flex items-center gap-2">

                <button
                  className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded transition-colors"
                  title="Download"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                </button>

                <button
                  className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded transition-colors"
                  title="Copy to clipboard"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>

              </div>
            </div>

            <div className="p-6">
              <RegionsTable
                data={
                  regionData
                }
                isLoading={
                  isLoading
                }
                isFetching={
                  isFetching
                }
                searchTerm={
                  searchTerm
                }
                currency={
                  currency
                }

                /*
                 * IMPORTANT:
                 *
                 * Wire the existing "More" button in RegionsTable
                 * to this handler.
                 *
                 * If your RegionsTable prop is named differently
                 * (for example onMoreClick/onDetails), use that
                 * existing prop name there.
                 */
                onMore={(
                  row: CountryProfitBreakdown
                ) =>
                  handleTileDetails(
                    row.country
                  )
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* ======================================================
            TILE DETAILS MODAL
        ====================================================== */}

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
              p =>
                p.id ===
                selectedPeriodForDetails
            )?.label || ''
          }

          dateRange={
            periodCardsData.find(
              p =>
                p.id ===
                selectedPeriodForDetails
            )?.dateRange || ''
          }

          data={getPeriodDetailData(
            selectedPeriodForDetails
          )}

          currency={
            currency
          }
        />
      </div>
    )
  }