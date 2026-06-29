'use client'

import React from 'react'
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

/**
 * BarChart component - Pure UI component
 */

export interface BarChartData {
  [key: string]: string | number
}

export interface BarChartProps {
  data: BarChartData[]
  xKey: string
  yKeys: Array<{ key: string; name: string; color?: string }>
  height?: number
  className?: string
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  xKey,
  yKeys,
  height = 300,
  className,
}) => {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          {yKeys.map((yKey) => (
            <Bar
              key={yKey.key}
              dataKey={yKey.key}
              name={yKey.name}
              fill={yKey.color || '#0ea5e9'}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}

