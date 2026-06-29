"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Input, Select } from '@/design-system/inputs'
import { DateRangeFilter } from '@/components/filters'
import { ReportFilters, ReportType } from '@/services/api/reports.api'
import { Button } from '@/design-system/buttons'

export interface ReportFilterPanelProps {
  reportType: ReportType
  filters: ReportFilters
  onReportTypeChange: (type: ReportType) => void
  onFiltersChange: (filters: ReportFilters) => void
  marketplaces?: Array<{ id: string; name: string; code: string }>
  className?: string
}

export const ReportFilterPanel: React.FC<ReportFilterPanelProps> = ({
  reportType,
  filters,
  onReportTypeChange,
  onFiltersChange,
  marketplaces = [],
  className,
}) => {
  const [localFilters, setLocalFilters] = useState<ReportFilters>(filters)

  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleFilterChange = (key: keyof ReportFilters, value: any) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value || undefined }))
  }

  const handleApply = () => {
    onFiltersChange(localFilters)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Report Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              label="Report Type"
              value={reportType}
              onChange={(e) => onReportTypeChange(e.target.value as ReportType)}
              options={[
                { value: 'profit', label: 'Profit' },
                { value: 'inventory', label: 'Inventory' },
                { value: 'ppc', label: 'PPC' },
                { value: 'returns', label: 'Returns' },
              ]}
            />
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
          </div>

          <DateRangeFilter
            startDate={localFilters.startDate}
            endDate={localFilters.endDate}
            onStartDateChange={(date) => handleFilterChange('startDate', date)}
            onEndDateChange={(date) => handleFilterChange('endDate', date)}
          />

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onFiltersChange(filters)}>
              Reset
            </Button>
            <Button onClick={handleApply}>Apply Filters</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

