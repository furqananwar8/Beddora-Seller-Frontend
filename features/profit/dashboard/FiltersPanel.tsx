'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Input, Select } from '@/design-system/inputs'
import { DateRangeFilter } from '@/components/filters'
import { ProfitFilters } from '@/services/api/profit.api'
import { Button } from '@/design-system/buttons'

/**
 * FiltersPanel component
 * 
 * Provides filtering controls for profit dashboard
 * Supports filtering by account, marketplace, SKU, and date range
 */
export interface FiltersPanelProps {
  filters: ProfitFilters
  onFiltersChange: (filters: ProfitFilters) => void
  accounts?: Array<{ id: string; name: string }>
  marketplaces?: Array<{ id: string; name: string; code: string }>
  className?: string
}

export const FiltersPanel: React.FC<FiltersPanelProps> = ({
  filters,
  onFiltersChange,
  accounts = [],
  marketplaces = [],
  className,
}) => {
  const [localFilters, setLocalFilters] = useState<ProfitFilters>(filters)

  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleFilterChange = (key: keyof ProfitFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value || undefined }
    setLocalFilters(newFilters)
  }

  const handleApplyFilters = () => {
    onFiltersChange(localFilters)
  }

  const handleResetFilters = () => {
    const resetFilters: ProfitFilters = {
      period: 'day',
    }
    setLocalFilters(resetFilters)
    onFiltersChange(resetFilters)
  }

  // Quick date presets
  const handleQuickDateRange = (days: number) => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const newFilters = {
      ...localFilters,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    }
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Account Filter */}
          {accounts.length > 0 && (
            <div>
              <Select
                label="Account"
                value={localFilters.accountId || ''}
                onChange={(e) => handleFilterChange('accountId', e.target.value)}
                options={[
                  { value: '', label: 'All Accounts' },
                  ...accounts.map((acc) => ({ value: acc.id, label: acc.name })),
                ]}
              />
            </div>
          )}

          {/* Marketplace Filter */}
          {marketplaces.length > 0 && (
            <div>
              <Select
                label="Marketplace"
                value={localFilters.marketplaceId || ''}
                onChange={(e) => handleFilterChange('marketplaceId', e.target.value)}
                options={[
                  { value: '', label: 'All Marketplaces' },
                  ...marketplaces.map((mp) => ({
                    value: mp.id,
                    label: `${mp.name} (${mp.code})`,
                  })),
                ]}
              />
            </div>
          )}

          {/* SKU Filter */}
          <div>
            <Input
              label="SKU"
              type="text"
              value={localFilters.sku || ''}
              onChange={(e) => handleFilterChange('sku', e.target.value)}
              placeholder="Filter by SKU"
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Date Range
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuickDateRange(7)}
              >
                Last 7 days
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuickDateRange(30)}
              >
                Last 30 days
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuickDateRange(90)}
              >
                Last 90 days
              </Button>
            </div>
            <DateRangeFilter
              startDate={localFilters.startDate}
              endDate={localFilters.endDate}
              onStartDateChange={(date) => handleFilterChange('startDate', date)}
              onEndDateChange={(date) => handleFilterChange('endDate', date)}
            />
          </div>

          {/* Period Filter */}
          <div>
            <Select
              label="Group By"
              value={localFilters.period || 'day'}
              onChange={(e) =>
                handleFilterChange('period', e.target.value as 'day' | 'week' | 'month')
              }
              options={[
                { value: 'day', label: 'Day' },
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' },
              ]}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-secondary-200">
            <Button onClick={handleApplyFilters} className="flex-1">
              Apply Filters
            </Button>
            <Button variant="outline" onClick={handleResetFilters}>
              Reset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

