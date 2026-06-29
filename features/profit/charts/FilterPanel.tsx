"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Input, Select } from '@/design-system/inputs'
import { DateRangeFilter } from '@/components/filters'
import { ChartFilters, ChartPeriod } from '@/services/api/charts.api'
import { Button } from '@/design-system/buttons'

export interface FilterPanelProps {
  filters: ChartFilters
  onFiltersChange: (filters: ChartFilters) => void
  marketplaces?: Array<{ id: string; name: string; code: string }>
  className?: string
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  marketplaces = [],
  className,
}) => {
  const [localFilters, setLocalFilters] = useState<ChartFilters>(filters)

  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleFilterChange = (key: keyof ChartFilters, value: any) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value || undefined }))
  }

  const handleApplyFilters = () => {
    onFiltersChange(localFilters)
  }

  const handleResetFilters = () => {
    const reset: ChartFilters = {
      period: 'month',
    }
    setLocalFilters(reset)
    onFiltersChange(reset)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Trend Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              label="SKU"
              value={localFilters.sku || ''}
              onChange={(e) => handleFilterChange('sku', e.target.value)}
            />
            {marketplaces.length > 0 && (
              <Select
                label="Marketplace"
                value={localFilters.marketplaceId || ''}
                onChange={(e) => handleFilterChange('marketplaceId', e.target.value)}
                options={[
                  { value: '', label: 'All Marketplaces' },
                  ...marketplaces.map((marketplace) => ({
                    value: marketplace.id,
                    label: `${marketplace.name} (${marketplace.code})`,
                  })),
                ]}
              />
            )}
            <Input
              label="Campaign ID"
              value={localFilters.campaignId || ''}
              onChange={(e) => handleFilterChange('campaignId', e.target.value)}
            />
            <Select
              label="Period"
              value={localFilters.period || 'month'}
              onChange={(e) => handleFilterChange('period', e.target.value as ChartPeriod)}
              options={[
                { value: 'day', label: 'Day' },
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' },
                { value: 'quarter', label: 'Quarter' },
                { value: 'year', label: 'Year' },
              ]}
            />
          </div>

          <DateRangeFilter
            startDate={localFilters.startDate}
            endDate={localFilters.endDate}
            onStartDateChange={(date) => handleFilterChange('startDate', date)}
            onEndDateChange={(date) => handleFilterChange('endDate', date)}
          />

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleResetFilters}>
              Reset
            </Button>
            <Button onClick={handleApplyFilters}>Apply Filters</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

