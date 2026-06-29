'use client'

import React from 'react'
import { KpiCard } from '@/design-system/kpi'
import { PPCOptimizationSummary } from '@/types/ppcOptimization.types'

export interface OptimizationCardProps {
  summary?: PPCOptimizationSummary
}

export const OptimizationCard: React.FC<OptimizationCardProps> = ({ summary }) => {
  if (!summary) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <KpiCard title="Total Keywords" value={summary.totalKeywords} />
      <KpiCard title="Autoplay" value={summary.autoplayKeywords} />
      <KpiCard title="Suggested Changes" value={summary.suggestedChanges} />
      <KpiCard title="Paused Keywords" value={summary.pausedKeywords} />
    </div>
  )
}

