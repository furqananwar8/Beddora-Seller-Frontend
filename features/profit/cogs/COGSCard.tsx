'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { COGSBySKUResponse } from '@/services/api/cogs.api'
import { formatCurrency, formatNumber } from '@/utils/format'
import { Spinner } from '@/design-system/loaders'
import { Button } from '@/design-system/buttons'

/**
 * COGSCard component
 * 
 * Displays current COGS information for a specific SKU
 * Shows total quantity, average unit cost, and breakdown by marketplace
 */
export interface COGSCardProps {
  data?: COGSBySKUResponse
  isLoading?: boolean
  error?: any
  onEdit?: () => void
  className?: string
}

export const COGSCard: React.FC<COGSCardProps> = ({
  data,
  isLoading,
  error,
  onEdit,
  className,
}) => {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>COGS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>COGS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 text-sm">Failed to load COGS data</div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>COGS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-secondary-500 text-sm">No COGS data available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>COGS - {data.sku}</CardTitle>
            <p className="text-sm text-secondary-500 mt-1">
              {data.entries.length} entries
            </p>
          </div>
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-secondary-600 mb-1">Total Quantity</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(data.totalQuantity, 0)}
            </div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm text-secondary-600 mb-1">Average Unit Cost</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.averageUnitCost)}
            </div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-sm text-secondary-600 mb-1">Total Cost</div>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(data.totalCost)}
            </div>
          </div>
        </div>

        {data.byMarketplace.length > 0 && (
          <div className="mt-4 pt-4 border-t border-secondary-200">
            <h4 className="font-semibold mb-2">By Marketplace</h4>
            <div className="space-y-2">
              {data.byMarketplace.map((mp, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-secondary-50 rounded">
                  <div>
                    <div className="font-medium">
                      {mp.marketplaceName || 'No Marketplace'}
                    </div>
                    <div className="text-sm text-secondary-600">
                      {formatNumber(mp.quantity, 0)} units
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(mp.totalCost)}</div>
                    <div className="text-sm text-secondary-600">
                      {formatCurrency(mp.averageUnitCost)}/unit
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

