'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { Card, CardContent } from '@/design-system/cards'
import { Spinner } from '@/design-system/loaders'
import { Button } from '@/design-system/buttons'
import { Select, Input } from '@/design-system/inputs'
import { useGetProfitByCountryQuery, ProfitFilters } from '@/services/api/profit.api'
import { ErrorComponent } from './ErrorComponent'
import { RegionsTable, RegionData } from './RegionsTable'
import { LeafletMap } from './LeafletMap'
import { cn } from '@/utils/cn'

/**
 * MapComponent
 * 
 * Main component for displaying profit per country/region on a world map
 * Matches the design with:
 * - Filters toolbar (Search, Sales/Stock radio, period, currency, Filter button)
 * - Interactive world map with zoom controls and intensity slider
 * - Regions table below showing detailed metrics
 * 
 * @example
 * <MapComponent
 *   startDate="2024-01-01"
 *   endDate="2024-12-31"
 *   accountId="xxx"
 * />
 */

export interface MapComponentProps {
  startDate?: string
  endDate?: string
  accountId?: string
  amazonAccountId?: string
  className?: string
}

/**
 * Get default date range (last 30 days)
 */
const getDefaultDateRange = () => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  }
}

/**
 * Convert country code to display name
 */
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

export const MapComponent: React.FC<MapComponentProps> = ({
  startDate: initialStartDate,
  endDate: initialEndDate,
  accountId,
  amazonAccountId,
  className,
}) => {
  // State for filters
  const defaultRange = getDefaultDateRange()
  const [startDate, setStartDate] = useState(initialStartDate || defaultRange.startDate)
  const [endDate, setEndDate] = useState(initialEndDate || defaultRange.endDate)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'sales' | 'stock'>('sales')
  const [period, setPeriod] = useState('last-30-days')
  const [currency, setCurrency] = useState('CAD')
  const [mapIntensity, setMapIntensity] = useState(50) // 0-100 slider value

  // Update date range when props change
  useEffect(() => {
    if (initialStartDate) setStartDate(initialStartDate)
    if (initialEndDate) setEndDate(initialEndDate)
  }, [initialStartDate, initialEndDate])

  // Build filters for API query
  const filters: ProfitFilters = {
    startDate,
    endDate,
    accountId,
    amazonAccountId,
  }

  // Fetch profit data by country
  const {
    data: countryData,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetProfitByCountryQuery(filters, {
    skip: !startDate || !endDate,
  })

  // Transform country data to region data format
  const regionData: RegionData[] = useMemo(() => {
    if (!countryData) return []

    return countryData.map((item) => ({
      country: item.country,
      region: getCountryName(item.country),
      profit: item.profit,
      orders: item.orders,
      // These would come from a more detailed API endpoint
      // For now, we'll use placeholders or calculate from available data
      stock: 0, // Would need inventory data
      unitsSold: item.orders, // Estimate: 1 unit per order (should be from API)
      sales: item.profit * 1.5, // Estimate (should be from API)
      amazonFees: item.profit * -0.3, // Estimate (should be from API)
      sellableReturnsPercent: 60, // Placeholder
      costOfGoods: item.profit * -0.2, // Estimate (should be from API)
      refundCost: item.profit * -0.1, // Estimate (should be from API)
      grossProfit: item.profit,
    }))
  }, [countryData])

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Filters Toolbar */}
      <div className="bg-surface-secondary border-b border-border">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Search Bar */}
            <div className="flex-1 min-w-[200px] max-w-md">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
                  Q
                </span>
                <Input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Sales/Stock Radio Buttons */}
            <div className="flex items-center gap-2 bg-surface border border-border rounded-lg p-1">
              <button
                onClick={() => setViewMode('sales')}
                className={cn(
                  'px-4 py-1.5 text-sm font-medium rounded transition-colors',
                  viewMode === 'sales'
                    ? 'bg-primary-600 text-white'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                Sales
              </button>
              <button
                onClick={() => setViewMode('stock')}
                className={cn(
                  'px-4 py-1.5 text-sm font-medium rounded transition-colors',
                  viewMode === 'stock'
                    ? 'bg-primary-600 text-white'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                Stock
              </button>
            </div>

            {/* Period Dropdown */}
            <div className="min-w-[140px]">
              <Select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                options={[
                  { value: 'last-7-days', label: 'Last 7 Days' },
                  { value: 'last-30-days', label: 'Last 30 Days' },
                  { value: 'last-90-days', label: 'Last 90 Days' },
                ]}
              />
            </div>

            {/* Currency Dropdown */}
            <div className="min-w-[100px]">
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                options={[
                  { value: 'CAD', label: 'CAD' },
                  { value: 'USD', label: 'USD' },
                  { value: 'EUR', label: 'EUR' },
                ]}
              />
            </div>

            {/* Filter Button */}
            <Button
              variant="primary"
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              Filter
            </Button>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <Card>
        <CardContent className="p-0">
          <div className="relative w-full h-[500px] bg-surface-tertiary">
            {/* Map Intensity Slider */}
            <div className="absolute top-4 right-4 z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-600 whitespace-nowrap">Less</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={mapIntensity}
                  onChange={(e) => setMapIntensity(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-xs text-gray-600 whitespace-nowrap">More</span>
              </div>
            </div>

            {/* Map Container */}
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
            ) : countryData && countryData.length > 0 ? (
              <LeafletMap data={countryData} intensity={mapIntensity} />
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
          </div>
        </CardContent>
      </Card>

      {/* Regions Table */}
      <Card>
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-border">
            <h2 className="text-lg font-semibold text-text-primary">All regions</h2>
            <div className="flex items-center gap-2">
              <button
                className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded transition-colors"
                title="Download"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Table Content */}
          <div className="p-6">
            <RegionsTable
              data={regionData}
              isLoading={isLoading}
              searchTerm={searchTerm}
              currency={currency}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
