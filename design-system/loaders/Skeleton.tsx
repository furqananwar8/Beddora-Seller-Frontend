'use client'

import React from 'react'
import { cn } from '@/utils/cn'

/**
 * Skeleton component - Loading placeholder
 * 
 * Usage:
 * <Skeleton width="100px" height="20px" />
 * <Skeleton className="w-full h-32" />
 */

export interface SkeletonProps {
  width?: string
  height?: string
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  className,
  variant = 'rectangular',
}) => {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  }

  return (
    <div
      className={cn(
        'animate-pulse bg-gradient-to-r from-surface-secondary via-surface-tertiary to-surface-secondary bg-[length:200%_100%]',
        variantClasses[variant],
        className
      )}
      style={{ width, height }}
    />
  )
}

/**
 * KPI Card Skeleton
 */
export const KpiCardSkeleton: React.FC = () => (
  <div className="ds-card p-4 space-y-2">
    <Skeleton width="60%" height="16px" />
    <Skeleton width="80%" height="32px" />
    <Skeleton width="50%" height="14px" />
  </div>
)

/**
 * Table Skeleton
 */
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 5,
}) => (
  <div className="space-y-3">
    {/* Header */}
    <div className="flex gap-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={`header-${i}`} width="100%" height="20px" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={`row-${rowIndex}`} className="flex gap-4">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={`cell-${rowIndex}-${colIndex}`} width="100%" height="16px" />
        ))}
      </div>
    ))}
  </div>
)

/**
 * Chart Skeleton
 */
export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = '280px' }) => (
  <div className="space-y-4">
    <Skeleton width="40%" height="20px" />
    <Skeleton width="100%" height={height} />
  </div>
)

