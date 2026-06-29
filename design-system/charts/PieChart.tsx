'use client'

import React from 'react'
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export interface PieChartData {
  name: string
  value: number
  color?: string
}

export interface PieChartProps {
  data: PieChartData[]
  height?: number
  className?: string
}

export const PieChart: React.FC<PieChartProps> = ({ data, height = 300, className }) => {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || '#94a3b8'} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}

