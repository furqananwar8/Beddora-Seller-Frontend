'use client'

import React, { useMemo, useState } from 'react'

import { Card, CardContent } from '@/design-system/cards'
import { Spinner } from '@/design-system/loaders'
import {
  useGetProfitByCountryQuery,
  ProfitFilters,
  CountryProfitBreakdown,
} from '@/services/api/profit.api'

import { ErrorComponent } from './ErrorComponent'
import { RegionsTable } from './RegionsTable'
import { LeafletMap } from './LeafletMap'
import { TileDetailsModal } from './TileDetailsModal'
import { DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import { format } from 'date-fns'
import { cn } from '@/utils/cn'

const getCountryName = (code: string): string => {
  const nameMap: Record<string, string> = {
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

  return nameMap[code] || code
}

export interface MapComponentProps {
  accountId?: string
  amazonAccountId?: string
  dateRange: DateRangeValue
  searchTerm: string
  selectedMarketplaces: string[]
  currency: string
  className?: string
}

export const MapComponent: React.FC<MapComponentProps> = ({
  accountId,
  amazonAccountId,
  dateRange,
  searchTerm,
  selectedMarketplaces,
  currency,
  className,
}) => {
  const [viewMode, setViewMode] = useState<'sales' | 'stock'>('sales')
  const [selectedPeriodForDetails, setSelectedPeriodForDetails] = useState<string | null>(null)

  const filters: ProfitFilters = useMemo(
    () => ({
      startDate: dateRange.startDate as string,
      endDate: dateRange.endDate as string,
      preset: dateRange.presetId as any,
      periodicity: dateRange.periodicity as any,
      accountId,
      amazonAccountId,
      marketplaces: selectedMarketplaces,
      currency,
    }),
    [
      dateRange,
      accountId,
      amazonAccountId,
      selectedMarketplaces,
      currency,
    ],
  )

  const {
    data: countryData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetProfitByCountryQuery(filters, {
    skip: !dateRange.startDate || !dateRange.endDate,
  })

  // ──────────────────────────────
  // Country Aggregations
  // ──────────────────────────────

  const countryAggregates = useMemo(() => {
    if (!countryData) {
      return []
    }

    const map = new Map<string, CountryProfitBreakdown>()

    for (const item of countryData) {
      const existing = map.get(item.country)

      if (!existing) {
        map.set(item.country, {
          ...item,
          region: getCountryName(item.country),
          amazonFeeDetails: {
            ...(item.amazonFeeDetails || {}),
          },
          refundDetails: {
            ...(item.refundDetails || {}),
          },
          advertisingDetails: {
            ...(item.advertisingDetails || {}),
          },
        })
        continue
      }

      existing.profit += Number(item.profit || 0)
      existing.orders += Number(item.orders || 0)
      existing.unitsSold += Number(item.unitsSold || 0)
      existing.sales += Number(item.sales || 0)
      existing.totalFees += Number(item.amazonFees || 0)
      existing.totalCOGS += Number(item.costOfGoods || 0)
      existing.refundCost += Number(item.refundCost || 0)
      existing.grossProfit += Number(item.grossProfit || 0)
      existing.netProfit += Number(item.netProfit || 0)
      existing.estimatedPayout =
        Number(existing.estimatedPayout || 0) + Number(item.estimatedPayout || 0)
      existing.totalExpenses += Number(item.indirectExpenses || 0)
      existing.totalPromo += Number(item.promoRebates || 0)
      existing.sellingFees += Number(item.sellingFees || 0)
      existing.fbaFees += Number(item.fbaFees || 0)
      existing.otherAmazonAdj += Number(item.otherAmazonAdj || 0)
      existing.sellableReturns += Number(item.sellableReturns || 0)
      existing.totalReturns += Number(item.totalReturns || 0)
      existing.refundedUnits =
        Number(existing.refundedUnits || 0) + Number(item.refundedUnits || 0)
      existing.totalRefunds =
        Number(existing.totalRefunds || 0) + Number(item.totalRefunds || 0)
      existing.totalRefundsCount =
        Number(existing.totalRefundsCount || 0) + Number(item.totalRefundsCount || 0)

      const feeDetails = item.amazonFeeDetails || {}
      const existingFeeDetails = existing.amazonFeeDetails || {}

      existing.amazonFeeDetails = {
        ...existingFeeDetails,
        fbaStorageFee:
          Number(existingFeeDetails.fbaStorageFee || 0) +
          Number(feeDetails.fbaStorageFee || 0),
        fbaPerUnitFulfillmentFee:
          Number(existingFeeDetails.fbaPerUnitFulfillmentFee || 0) +
          Number(feeDetails.fbaPerUnitFulfillmentFee || 0),
        referralFee:
          Number(existingFeeDetails.referralFee || 0) +
          Number(feeDetails.referralFee || 0),
        dealParticipationFee:
          Number(existingFeeDetails.dealParticipationFee || 0) +
          Number(feeDetails.dealParticipationFee || 0),
        dealPerformanceFee:
          Number(existingFeeDetails.dealPerformanceFee || 0) +
          Number(feeDetails.dealPerformanceFee || 0),
        fbaDisposalFee:
          Number(existingFeeDetails.fbaDisposalFee || 0) +
          Number(feeDetails.fbaDisposalFee || 0),
        salesTaxCollectionFee:
          Number(existingFeeDetails.salesTaxCollectionFee || 0) +
          Number(feeDetails.salesTaxCollectionFee || 0),
        reversalReimbursement:
          Number(existingFeeDetails.reversalReimbursement || 0) +
          Number(feeDetails.reversalReimbursement || 0),
        other:
          Number(existingFeeDetails.other || 0) +
          Number(feeDetails.other || 0),
      }

      const refundDetails = item.refundDetails || {}
      const existingRefundDetails = existing.refundDetails || {}

      existing.refundDetails = {
        ...existingRefundDetails,
        refundedAmount:
          Number(existingRefundDetails.refundedAmount || 0) +
          Number(refundDetails.refundedAmount || 0),
        refundCommission:
          Number(existingRefundDetails.refundCommission || 0) +
          Number(refundDetails.refundCommission || 0),
        promotion:
          Number(existingRefundDetails.promotion || 0) +
          Number(refundDetails.promotion || 0),
        valueOfReturnedItems:
          Number(existingRefundDetails.valueOfReturnedItems || 0) +
          Number(refundDetails.valueOfReturnedItems || 0),
        refundedReferralFee:
          Number(existingRefundDetails.refundedReferralFee || 0) +
          Number(refundDetails.refundedReferralFee || 0),
      }

      const advertisingDetails = item.advertisingDetails || {}
      const existingAdvertisingDetails = existing.advertisingDetails || {}

      existing.advertisingCost =
        Number(existing.advertisingCost || 0) + Number(item.advertisingCost || 0)

      existing.advertisingDetails = {
        ...existingAdvertisingDetails,
        sponsoredProducts:
          Number(existingAdvertisingDetails.sponsoredProducts || 0) +
          Number(advertisingDetails.sponsoredProducts || 0),
        sponsoredBrandsVideo:
          Number(existingAdvertisingDetails.sponsoredBrandsVideo || 0) +
          Number(advertisingDetails.sponsoredBrandsVideo || 0),
        sponsoredDisplay:
          Number(existingAdvertisingDetails.sponsoredDisplay || 0) +
          Number(advertisingDetails.sponsoredDisplay || 0),
        sponsoredBrands:
          Number(existingAdvertisingDetails.sponsoredBrands || 0) +
          Number(advertisingDetails.sponsoredBrands || 0),
      }
    }

    for (const country of map.values()) {
      const sales = Number(country.sales || 0)
      const netProfit = Number(country.netProfit || 0)
      const cogs = Math.abs(Number(country.costOfGoods || 0))
      const advertisingCost = Number(country.advertisingCost || 0)

      country.refundPercentage = Number(
        (
          country.unitsSold > 0
            ? (Number(country.refundedUnits || 0) / country.unitsSold) * 100
            : 0
        ).toFixed(2),
      )

      country.margin = Number(
        (sales > 0 ? (netProfit / sales) * 100 : 0).toFixed(2),
      )

      country.roi = Number(
        (cogs > 0 ? (netProfit / cogs) * 100 : 0).toFixed(2),
      )

      country.realACOS = Number(
        (sales > 0 ? (advertisingCost / sales) * 100 : 0).toFixed(2),
      )
    }

    return Array.from(map.values())
  }, [countryData])

  const countryDataForMap = useMemo(() => {
    return countryAggregates.map((item) => ({
      country: item.country,
      profit: item.profit,
      orders: item.orders,
      unitsSold: item.unitsSold || item.orders,
    }))
  }, [countryAggregates])

  const regionData = useMemo(() => {
    if (!countryData) {
      return []
    }

    return countryData.map((item) => ({
      ...item,
      region: item.region || getCountryName(item.country),
      grossProfit: item.grossProfit ?? item.profit,
      isExpandable: false,
    }))
  }, [countryData])

  const periodCardsData = useMemo(() => {
    return countryAggregates.map((country) => ({
      id: country.country,
      label: country.region || getCountryName(country.country),
      dateRange: `${format(
        new Date(`${dateRange.startDate}T00:00:00`),
        'MMM d, yyyy',
      )} - ${format(
        new Date(`${dateRange.endDate}T00:00:00`),
        'MMM d, yyyy',
      )}`,
    }))
  }, [countryAggregates, dateRange.startDate, dateRange.endDate])

  const getPeriodDetailData = (tileId: string | null) => {
    if (!tileId) return null

    const country = countryAggregates.find((item) => item.country === tileId)
    if (!country) return null

    const advertising = (country as any).advertisingDetails || {}
    const refundDetails = (country as any).refundDetails || {}
    const amazonFeeDetails = (country as any).amazonFeeDetails || {}
    const advertisingCost = Number((country as any).advertisingCost || 0)
    const totalRefunds = Number(
      (country as any).totalRefunds ?? country.refundCost ?? 0,
    )
    const totalRefundsCount = Number((country as any).totalRefundsCount ?? 0)

    return {
      currency,
      salesRevenue: Number(country.sales || 0),
      ordersUnitCount: Number(country.unitsSold || 0),
      orders: Number(country.orders || 0),
      totalPromo: Number(country.promoRebates || 0),
      advertisingCost,
      estimatedPayout: Number(country.estimatedPayout || 0),
      advertisingDetails: {
        sponsoredProducts: Number(advertising.sponsoredProducts || 0),
        sponsoredBrandsVideo: Number(advertising.sponsoredBrandsVideo || 0),
        sponsoredDisplay: Number(advertising.sponsoredDisplay || 0),
        sponsoredBrands: Number(advertising.sponsoredBrands || 0),
      },
      totalRefunds,
      totalRefundsCount,
      refundCost: Number(country.refundCost || 0),
      refundDetails: {
        refundedAmount: Number(refundDetails.refundedAmount || 0),
        refundCommission: Number(refundDetails.refundCommission || 0),
        promotion: Number(refundDetails.promotion || 0),
        valueOfReturnedItems: Number(refundDetails.valueOfReturnedItems || 0),
        refundedReferralFee: Number(refundDetails.refundedReferralFee || 0),
      },
      refundPercentage: Number(country.refundPercentage || 0),
      totalFees: Number(country.amazonFees || 0),
      amazonFeeDetails: {
        fbaStorageFee: Number(amazonFeeDetails.fbaStorageFee || 0),
        fbaPerUnitFulfillmentFee: Number(amazonFeeDetails.fbaPerUnitFulfillmentFee || 0),
        referralFee: Number(amazonFeeDetails.referralFee || 0),
        dealParticipationFee: Number(amazonFeeDetails.dealParticipationFee || 0),
        dealPerformanceFee: Number(amazonFeeDetails.dealPerformanceFee || 0),
        fbaDisposalFee: Number(amazonFeeDetails.fbaDisposalFee || 0),
        salesTaxCollectionFee: Number(amazonFeeDetails.salesTaxCollectionFee || 0),
        reversalReimbursement: Number(amazonFeeDetails.reversalReimbursement || 0),
        other: Number(amazonFeeDetails.other || 0),
      },
      totalCOGS: Number(country.costOfGoods || 0),
      expenses: Number((country as any).expenses || 0),
      indirectExpenses: Number(country.indirectExpenses || 0),
      grossProfit: Number(country.grossProfit || 0),
      netProfit: Number(country.netProfit || 0),
      profit: Number(country.profit || 0),
      margin: Number((country as any).margin || 0),
      realACOS:
        advertisingCost > 0 && Number(country.sales || 0) > 0
          ? (advertisingCost / Number(country.sales)) * 100
          : 0,
      roi: Number((country as any).roi || 0),
      refundedUnits: Number((country as any).refundedUnits || 0),
      sellableReturns: Number(country.sellableReturns || 0),
      sellableReturnsPercent: Number((country as any).sellableReturnsPercent || 0),
      totalReturns: Number(country.totalReturns || 0),
      sellingFees: Number(country.sellingFees || 0),
      fbaFees: Number(country.fbaFees || 0),
      otherAmazonAdj: Number(country.otherAmazonAdj || 0),
      _country: country.country,
    }
  }

  const handleTileDetails = (countryId: string) => {
    setSelectedPeriodForDetails(countryId)
  }

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Map Card */}
      <Card>
        <CardContent className="p-0">
          <div className="relative w-full h-[500px] bg-surface-tertiary">
            {/* Overlay Mode Switcher */}
            <div className="absolute top-4 left-4 z-20 bg-surface/90 backdrop-blur border border-border rounded-lg p-1 shadow-md">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setViewMode('sales')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded transition-colors',
                    viewMode === 'sales'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary',
                  )}
                >
                  Sales
                </button>

                <button
                  onClick={() => setViewMode('stock')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded transition-colors',
                    viewMode === 'stock'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary',
                  )}
                >
                  Stock
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-3">
                  <Spinner size="lg" />
                  <p className="text-sm text-text-secondary">Loading map...</p>
                </div>
              </div>
            ) : isError ? (
              <div className="flex items-center justify-center h-full">
                <ErrorComponent error={error} onRetry={() => refetch()} />
              </div>
            ) : countryDataForMap.length > 0 ? (
              <LeafletMap
                data={countryDataForMap as any}
                onCountryClick={() => {}}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-text-secondary mb-2">No data available</p>
                  <p className="text-sm text-text-muted">
                    Try adjusting the date range or filters
                  </p>
                </div>
              </div>
            )}

            {isFetching && !isLoading && (
              <div className="absolute top-3 right-3 z-20 bg-surface border border-border rounded-lg px-3 py-2 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <Spinner size="sm" />
                  Updating...
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Regions Table Card */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-border">
            <h2 className="text-lg font-semibold text-text-primary">All regions</h2>
          </div>

          <div className="p-6">
            <RegionsTable
              data={regionData}
              isLoading={isLoading}
              isFetching={isFetching}
              searchTerm={searchTerm}
              currency={currency}
              onMore={(row: CountryProfitBreakdown) =>
                handleTileDetails(row.country)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
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
        currency={currency}
      />
    </div>
  )
}