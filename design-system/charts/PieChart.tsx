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
  innerRadius?: number | string
  outerRadius?: number | string
  /** Gap between slices, in degrees. */
  paddingAngle?: number
  /** Turn off to draw the legend yourself. Defaults to on. */
  showLegend?: boolean
  showTooltip?: boolean
  /** Shown in the middle of the donut, e.g. the total. */
  centerLabel?: React.ReactNode
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  height = 300,
  className,
  innerRadius = 60,
  outerRadius = 100,
  paddingAngle = 2,
  showLegend = true,
  showTooltip = true,
  centerLabel,
}) => {
  return (
    <div className={className}>
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={data.length > 1 ? paddingAngle : 0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || '#94a3b8'} />
              ))}
            </Pie>
            {showTooltip && <Tooltip />}
            {showLegend && <Legend />}
          </RechartsPieChart>
        </ResponsiveContainer>
        {centerLabel !== undefined && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">{centerLabel}</div>
        )}
      </div>
    </div>
  )
}
