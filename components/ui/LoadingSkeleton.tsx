import React from 'react'

interface TableSkeletonProps {
  rows?: number
  columns?: number
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, columns = 10 }) => (
  <div className="animate-pulse space-y-3">
    <div className="h-10 bg-surface-secondary"></div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-8 bg-surface-secondary"></div>
    ))}
  </div>
)

export const ChartSkeleton = () => (
  <div className="animate-pulse flex items-center justify-center w-full h-80 bg-surface-secondary">
    <div className="text-text-muted">Loading chart...</div>
  </div>
)

export const CardSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-24 bg-surface-secondary"></div>
  </div>
)
