'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { BarChart } from '@/design-system/charts'

/**
 * ReportCard component
 * 
 * Feature component for displaying reports
 * Connect to reports API here
 */
export interface ReportCardProps {
  title: string
  data?: any[]
}

export const ReportCard: React.FC<ReportCardProps> = ({ title, data = [] }) => {
  // Example chart data
  const chartData = [
    { month: 'Jan', value: 100 },
    { month: 'Feb', value: 150 },
    { month: 'Mar', value: 200 },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <BarChart
          data={chartData}
          xKey="month"
          yKeys={[{ key: 'value', name: 'Value', color: '#0ea5e9' }]}
          height={300}
        />
      </CardContent>
    </Card>
  )
}

