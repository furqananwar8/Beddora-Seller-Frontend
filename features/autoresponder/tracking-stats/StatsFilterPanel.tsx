'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Button } from '@/design-system/buttons'
import { EmailStatsFilters, ReviewStatsFilters } from '@/services/api/trackingStats.api'

export interface StatsFilterPanelProps {
  type: 'email' | 'review'
  filters: EmailStatsFilters | ReviewStatsFilters
  onFilterChange: (filters: EmailStatsFilters | ReviewStatsFilters) => void
  onReset: () => void
  templates?: Array<{ id: string; name: string }>
  marketplaces?: Array<{ id: string; name: string }>
  products?: Array<{ id: string; title: string; sku: string }>
}

export const StatsFilterPanel: React.FC<StatsFilterPanelProps> = ({
  type,
  filters,
  onFilterChange,
  onReset,
  templates = [],
  marketplaces = [],
  products = [],
}) => {
  const handleChange = (key: string, value: string | undefined) => {
    onFilterChange({
      ...filters,
      [key]: value || undefined,
    })
  }

  const handleDateChange = (key: 'startDate' | 'endDate', value: string) => {
    onFilterChange({
      ...filters,
      [key]: value || undefined,
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Filters</CardTitle>
          <Button size="sm" variant="ghost" onClick={onReset}>
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Template Filter */}
          {templates.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Template
              </label>
              <select
                value={filters.templateId || ''}
                onChange={(e) => handleChange('templateId', e.target.value)}
                className="w-full text-sm border border-border rounded px-3 py-2 bg-surface"
              >
                <option value="">All Templates</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Marketplace Filter */}
          {marketplaces.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Marketplace
              </label>
              <select
                value={filters.marketplaceId || ''}
                onChange={(e) => handleChange('marketplaceId', e.target.value)}
                className="w-full text-sm border border-border rounded px-3 py-2 bg-surface"
              >
                <option value="">All Marketplaces</option>
                {marketplaces.map((marketplace) => (
                  <option key={marketplace.id} value={marketplace.id}>
                    {marketplace.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Product Filter */}
          {products.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Product
              </label>
              <select
                value={filters.productId || ''}
                onChange={(e) => handleChange('productId', e.target.value)}
                className="w-full text-sm border border-border rounded px-3 py-2 bg-surface"
              >
                <option value="">All Products</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.title} ({product.sku})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* SKU Filter */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">SKU</label>
            <input
              type="text"
              value={filters.sku || ''}
              onChange={(e) => handleChange('sku', e.target.value)}
              placeholder="Enter SKU"
              className="w-full text-sm border border-border rounded px-3 py-2 bg-surface"
            />
          </div>

          {/* ASIN Filter (for review stats) */}
          {type === 'review' && 'asin' in filters && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">ASIN</label>
              <input
                type="text"
                value={filters.asin || ''}
                onChange={(e) => handleChange('asin', e.target.value)}
                placeholder="Enter ASIN"
                className="w-full text-sm border border-border rounded px-3 py-2 bg-surface"
              />
            </div>
          )}

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className="w-full text-sm border border-border rounded px-3 py-2 bg-surface"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className="w-full text-sm border border-border rounded px-3 py-2 bg-surface"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

