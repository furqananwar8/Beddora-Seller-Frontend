'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { formatCurrency, formatNumber, formatPercentage } from '@/utils/format'
import { Spinner } from '@/design-system/loaders'
import { Button } from '@/design-system/buttons'

/**
 * KPICard component
 * 
 * Displays individual KPI metrics in a card layout
 * Supports drill-down to detailed tables
 */
export type KPIType =
  | 'units-sold'
  | 'returns-cost'
  | 'advertising-cost'
  | 'fba-fees'
  | 'payout-estimate'

export interface KPICardProps {
  type: KPIType
  title: string
  value: number | string
  subtitle?: string
  trend?: {
    value: number
    label: string
    isPositive: boolean
  }
  isLoading?: boolean
  error?: any
  onDrillDown?: () => void
  className?: string
  icon?: React.ReactNode
  color?: 'blue' | 'green' | 'red' | 'purple' | 'orange'
}

export const KPICard: React.FC<KPICardProps> = ({
  type,
  title,
  value,
  subtitle,
  trend,
  isLoading,
  error,
  onDrillDown,
  className,
  icon,
  color = 'blue',
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    red: 'bg-red-50 border-red-200 text-red-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
  }

  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val
    if (type === 'units-sold') return formatNumber(val, 0)
    return formatCurrency(val)
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
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
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 text-sm">Failed to load KPI data</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${className} hover:shadow-md transition-shadow`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon && <div className="text-2xl">{icon}</div>}
            <CardTitle>{title}</CardTitle>
          </div>
          {onDrillDown && (
            <Button variant="ghost" size="sm" onClick={onDrillDown}>
              View Details
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className={`p-4 rounded-lg border-2 ${colorClasses[color]}`}>
          <div className="text-3xl font-bold mb-2">{formatValue(value)}</div>
          {subtitle && <div className="text-sm opacity-75">{subtitle}</div>}
          {trend && (
            <div className="mt-2 text-sm">
              <span className={trend.isPositive ? 'text-green-600' : 'text-red-600'}>
                {trend.isPositive ? '↑' : '↓'} {formatPercentage(Math.abs(trend.value))}
              </span>
              <span className="text-secondary-600 ml-1">{trend.label}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

