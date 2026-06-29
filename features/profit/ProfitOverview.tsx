'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { LineChart } from '@/design-system/charts'
// import { useGetProfitTrendsQuery } from '@/services/api/profit.api'

/**
 * ProfitOverview component
 * 
 * Feature component for profit overview
 * Connect to profit API here
 */
export const ProfitOverview: React.FC = () => {
  // const { data, isLoading, error } = useGetProfitTrendsQuery({})

  // Example chart data structure
  const chartData = [
    { date: '2024-01', revenue: 1000, profit: 500 },
    { date: '2024-02', revenue: 1200, profit: 600 },
    { date: '2024-03', revenue: 1500, profit: 750 },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <LineChart
          data={chartData}
          xKey="date"
          yKeys={[
            { key: 'revenue', name: 'Revenue', color: '#0ea5e9' },
            { key: 'profit', name: 'Profit', color: '#22c55e' },
          ]}
          height={300}
        />
      </CardContent>
    </Card>
  )
}

