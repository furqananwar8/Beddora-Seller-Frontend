'use client'

import React, { useRef, useEffect, useState } from 'react'
import {
  ComposedChart,
  Line,
  Bar,
  Area,
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
  type?: 'line' | 'area'
  strokeWidth?: number
  showDots?: boolean
}

export interface BarSeries {
  key: string
  name: string
  color?: string
  yAxisId?: 'left' | 'right'
  opacity?: number
  radius?: number | [number, number, number, number]
  stackId?: string
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

  tooltipFormatter?: (
    value: any,
    name: string
  ) => [string, string]
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

  const axisTickStyle = {
    fontSize: 11,
    fill: '#64748b',
  }

  const leftAxisWidth = hasLeftAxis ? 90 : 0
  const rightAxisWidth = hasRightAxis ? 70 : 0

  return (
    <div ref={containerRef} className={cn('w-full h-full', className)}>
      <ResponsiveContainer width="100%" height={containerHeight}>
        <ComposedChart
          data={data}
          // Increases bar width by reducing gaps between bar groups and individual bars
          barCategoryGap="100%"
          barGap={5}
          margin={{
            top: 16,
            right: hasRightAxis ? 12 : 8,
            left: hasLeftAxis ? 12 : 8,
            bottom: 20,
          }}
        >
          {/* Subtle Horizontal Grid */}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f1f5f9"
            vertical={false}
          />

          {/* X Axis */}
          <XAxis
            dataKey={xKey}
            tick={axisTickStyle}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
            dy={8}
            minTickGap={16}
          />

          {/* Left Y Axis (Currency) */}
          {hasLeftAxis && (
            <YAxis
              yAxisId="left"
              tick={axisTickStyle}
              axisLine={false}
              tickLine={false}
              tickFormatter={leftYAxisFormatter}
              width={leftAxisWidth}
              tickMargin={8}
              allowDecimals={false}
              label={
                leftYAxisLabel
                  ? {
                      value: leftYAxisLabel,
                      angle: -90,
                      position: 'insideLeft',
                      style: {
                        textAnchor: 'middle',
                        fill: '#64748b',
                        fontSize: 11,
                      },
                    }
                  : undefined
              }
            />
          )}

          {/* Right Y Axis (Volume / Units) */}
          {hasRightAxis && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={axisTickStyle}
              axisLine={false}
              tickLine={false}
              tickFormatter={rightYAxisFormatter}
              width={rightAxisWidth}
              tickMargin={8}
              allowDecimals={false}
              label={
                rightYAxisLabel
                  ? {
                      value: rightYAxisLabel,
                      angle: 90,
                      position: 'insideRight',
                      style: {
                        textAnchor: 'middle',
                        fill: '#64748b',
                        fontSize: 11,
                      },
                    }
                  : undefined
              }
            />
          )}

          {/* Tooltip */}
          <Tooltip
            formatter={tooltipFormatter}
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.08)',
              fontSize: 13,
              padding: '12px 16px',
            }}
            labelStyle={{
              color: '#0f172a',
              fontWeight: 600,
              marginBottom: 8,
              fontSize: 13,
            }}
            itemStyle={{
              fontSize: 12,
              padding: '2px 0',
            }}
            cursor={{
              fill: 'rgba(241, 245, 249, 0.6)',
            }}
          />

          {/* Legend */}
          <Legend
            wrapperStyle={{
              fontSize: 12,
              paddingTop: 16,
              color: '#475569',
            }}
            iconType="circle"
            iconSize={8}
          />

          {/* Bar Series */}
          {barSeries.map((series) => (
            <Bar
              key={series.key}
              dataKey={series.key}
              name={series.name}
              fill={series.color || '#3b82f6'}
              yAxisId={series.yAxisId || 'left'}
              stackId={series.stackId}
              radius={
                Array.isArray(series.radius)
                  ? series.radius
                  : [
                      series.radius ?? 6,
                      series.radius ?? 6,
                      0,
                      0,
                    ]
              }
              // Increased maxBarSize from 36px to 52px for fuller, wider bars
              maxBarSize={64}
              fillOpacity={series.opacity ?? 0.85}
            />
          ))}

          {/* Line / Area Series */}
          {lineSeries.map((series) => {
            const stroke = series.color || '#6366f1'

            if (series.type === 'area') {
              return (
                <Area
                  key={series.key}
                  type="monotone"
                  dataKey={series.key}
                  name={series.name}
                  stroke={stroke}
                  fill={stroke}
                  fillOpacity={0.12}
                  strokeWidth={series.strokeWidth ?? 2.5}
                  dot={
                    series.showDots === false
                      ? false
                      : {
                          r: 3,
                          strokeWidth: 0,
                          fill: stroke,
                        }
                  }
                  activeDot={{
                    r: 6,
                    stroke,
                    strokeWidth: 2,
                    fill: '#ffffff',
                  }}
                  yAxisId={series.yAxisId || 'left'}
                />
              )
            }

            return (
              <Line
                key={series.key}
                type="monotone"
                dataKey={series.key}
                name={series.name}
                stroke={stroke}
                strokeWidth={series.strokeWidth ?? 2.5}
                dot={
                  series.showDots === false
                    ? false
                    : {
                        r: 3.5,
                        strokeWidth: 0,
                        fill: stroke,
                      }
                }
                activeDot={{
                  r: 6,
                  stroke,
                  strokeWidth: 2,
                  fill: '#ffffff',
                }}
                yAxisId={series.yAxisId || 'left'}
              />
            )
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}