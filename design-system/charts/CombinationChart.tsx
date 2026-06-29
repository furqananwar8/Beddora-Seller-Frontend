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

/**
 * CombinationChart component - Line + Bar chart with dual Y-axes
 * 
 * Supports both line and bar series with separate Y-axes
 */

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
  // Determine which Y-axis to use based on series
  const hasLeftAxis = lineSeries.some(s => s.yAxisId !== 'right') || barSeries.some(s => s.yAxisId !== 'right')
  const hasRightAxis = lineSeries.some(s => s.yAxisId === 'right') || barSeries.some(s => s.yAxisId === 'right')

  // Use ref to measure container height when height is not provided
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
  
  return (
    <div ref={containerRef} className={cn('w-full h-full', className)}>
      <ResponsiveContainer width="100%" height={containerHeight}>
        <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          
          {hasLeftAxis && (
            <YAxis
              yAxisId="left"
              label={leftYAxisLabel ? { value: leftYAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
              tickFormatter={leftYAxisFormatter}
            />
          )}
          
          {hasRightAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              label={rightYAxisLabel ? { value: rightYAxisLabel, angle: 90, position: 'insideRight' } : undefined}
              tickFormatter={rightYAxisFormatter}
            />
          )}
          
          <Tooltip formatter={tooltipFormatter} />
          <Legend />
          
          {barSeries.map((series) => (
            <Bar
              key={series.key}
              dataKey={series.key}
              name={series.name}
              fill={series.color || '#0ea5e9'}
              yAxisId={series.yAxisId || 'left'}
            />
          ))}
          
          {lineSeries.map((series) => (
            <Line
              key={series.key}
              type="monotone"
              dataKey={series.key}
              name={series.name}
              stroke={series.color || '#0ea5e9'}
              strokeWidth={series.key === 'Refunds' ? 2 : 2}
              dot={series.key === 'Refunds' ? { r: 5, fill: series.color || '#ec4899' } : { r: 4 }}
              yAxisId={series.yAxisId || 'left'}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
