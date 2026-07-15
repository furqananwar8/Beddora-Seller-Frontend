'use client'

import React, { useRef, useEffect, useState } from 'react'
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { cn } from '@/utils/cn'

export interface CombinationChartData {
  [key: string]: string | number
}

export interface LineSeries {
  key: string
  name: string
  color?: string
  yAxisId?: 'left' | 'right'
}

export interface BarSeries {
  key: string
  name: string
  color?: string
  yAxisId?: 'left' | 'right'
}

export interface CombinationChartProps {
  data: CombinationChartData[]
  xKey: string
  lineSeries?: LineSeries[]
  barSeries?: BarSeries[]
  height?: number
  className?: string
  leftYAxisLabel?: string
  rightYAxisLabel?: string
  leftYAxisFormatter?: (value: any) => string
  rightYAxisFormatter?: (value: any) => string
  tooltipFormatter?: (value: any, name: string) => [string, string]
}

export const CombinationChart: React.FC<CombinationChartProps> = ({
  data,
  xKey,
  lineSeries = [],
  barSeries = [],
  height = 400,
  className,
  leftYAxisLabel,
  rightYAxisLabel,
  leftYAxisFormatter,
  rightYAxisFormatter,
  tooltipFormatter,
}) => {
  const hasLeftAxis =
    lineSeries.some((s) => s.yAxisId !== 'right') ||
    barSeries.some((s) => s.yAxisId !== 'right')
  const hasRightAxis =
    lineSeries.some((s) => s.yAxisId === 'right') ||
    barSeries.some((s) => s.yAxisId === 'right')

  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(height || 400)

  useEffect(() => {
    if (!height && containerRef.current) {
      const updateHeight = () => {
        if (containerRef.current) {
          setContainerHeight(containerRef.current.clientHeight)
        }
      }

      updateHeight()
      const resizeObserver = new ResizeObserver(updateHeight)
      resizeObserver.observe(containerRef.current)

      return () => resizeObserver.disconnect()
    }
  }, [height])

  const axisTickStyle = { fontSize: 11, fill: '#64748b' }

  return (
    <div ref={containerRef} className={cn('w-full h-full', className)}>
      <ResponsiveContainer width="100%" height={containerHeight}>
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            vertical={false}
          />

          <XAxis
            dataKey={xKey}
            tick={axisTickStyle}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
            dy={8}
          />

          {hasLeftAxis && (
            <YAxis
              yAxisId="left"
              tick={axisTickStyle}
              axisLine={false}
              tickLine={false}
              tickFormatter={leftYAxisFormatter}
              width={70}
            />
          )}

          {hasRightAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={axisTickStyle}
              axisLine={false}
              tickLine={false}
              tickFormatter={rightYAxisFormatter}
              width={55}
            />
          )}

          <Tooltip
            formatter={tooltipFormatter}
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              fontSize: 13,
              padding: '12px 16px',
            }}
            labelStyle={{
              color: '#1e293b',
              fontWeight: 600,
              marginBottom: 8,
              fontSize: 13,
            }}
            itemStyle={{ fontSize: 12 }}
            cursor={{ fill: 'rgba(0,0,0,0.03)' }}
          />

          <Legend
            wrapperStyle={{
              fontSize: 12,
              paddingTop: 16,
              color: '#475569',
            }}
            iconType="circle"
            iconSize={8}
          />

          {barSeries.map((series) => (
            <Bar
              key={series.key}
              dataKey={series.key}
              name={series.name}
              fill={series.color || '#0ea5e9'}
              yAxisId={series.yAxisId || 'left'}
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
            />
          ))}

          {lineSeries.map((series) => (
            <Line
              key={series.key}
              type="monotone"
              dataKey={series.key}
              name={series.name}
              stroke={series.color || '#0ea5e9'}
              strokeWidth={2.5}
              dot={{ r: 4, strokeWidth: 0, fill: series.color || '#0ea5e9' }}
              activeDot={{
                r: 6,
                stroke: series.color || '#0ea5e9',
                strokeWidth: 2,
                fill: '#ffffff',
              }}
              yAxisId={series.yAxisId || 'left'}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}