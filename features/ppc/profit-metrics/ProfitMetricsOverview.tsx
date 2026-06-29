'use client'

import React from 'react'
import { KpiCard } from '@/design-system/kpi'
import { PPCProfitOverview } from '@/types/ppcProfitMetrics.types'
import { formatNumber } from '@/utils/format'

export interface ProfitMetricsOverviewProps {
  data?: PPCProfitOverview
}

export const ProfitMetricsOverview: React.FC<ProfitMetricsOverviewProps> = ({ data }) => {
  if (!data) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <KpiCard title="Total Spend" value={formatNumber(data.totalSpend, 2)} />
      <KpiCard title="Total Sales" value={formatNumber(data.totalSales, 2)} />
      <KpiCard title="Break-even ACOS" value={`${formatNumber(data.breakEvenAcos, 2)}%`} />
      <KpiCard title="Estimated Profit" value={formatNumber(data.estimatedProfit, 2)} />
    </div>
  )
}

