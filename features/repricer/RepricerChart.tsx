"use client"

import React from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { formatCurrency, formatPercentage } from '@/utils/format'
import { RepricerChartDataPoint } from '@/services/api/repricer.api'

export interface RepricerChartProps {
  data?: RepricerChartDataPoint[]
  isLoading?: boolean
  chartType?: 'price' | 'buybox' | 'revenue' | 'margin'
}

/**
 * Repricer Chart Component
 * 
 * Displays pricing trends, Buy Box win rate, revenue, and margin over time
 */
export const RepricerChart = ({ data, isLoading, chartType = 'price' }: RepricerChartProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Chart...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full animate-pulse bg-surface-secondary rounded" />
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Data Available</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full flex items-center justify-center text-text-muted">
            No chart data available for the selected period
          </div>
        </CardContent>
      </Card>
    )
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null

    return (
      <div className="rounded-lg border border-border-primary bg-surface-primary p-3 shadow-lg">
        <p className="mb-2 font-semibold text-text-primary">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-text-muted">{entry.name}:</span>
            <span className="font-medium text-text-primary">
              {entry.name.includes('Rate') || entry.name.includes('Margin')
                ? formatPercentage(entry.value)
                : formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
    )
  }

  const renderChart = () => {
    switch (chartType) {
      case 'price':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-primary))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--text-muted))"
                tick={{ fill: 'hsl(var(--text-muted))' }}
              />
              <YAxis
                stroke="hsl(var(--text-muted))"
                tick={{ fill: 'hsl(var(--text-muted))' }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="averagePrice"
                name="Average Price"
                stroke="hsl(var(--primary-600))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary-600))', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )

      case 'buybox':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="buyBoxGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success-600))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--success-600))" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-primary))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--text-muted))"
                tick={{ fill: 'hsl(var(--text-muted))' }}
              />
              <YAxis
                stroke="hsl(var(--text-muted))"
                tick={{ fill: 'hsl(var(--text-muted))' }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="buyBoxWinRate"
                name="Buy Box Win Rate"
                stroke="hsl(var(--success-600))"
                fillOpacity={1}
                fill="url(#buyBoxGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )

      case 'revenue':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--info-600))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--info-600))" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-primary))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--text-muted))"
                tick={{ fill: 'hsl(var(--text-muted))' }}
              />
              <YAxis
                stroke="hsl(var(--text-muted))"
                tick={{ fill: 'hsl(var(--text-muted))' }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="hsl(var(--info-600))"
                fillOpacity={1}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )

      case 'margin':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-primary))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--text-muted))"
                tick={{ fill: 'hsl(var(--text-muted))' }}
              />
              <YAxis
                stroke="hsl(var(--text-muted))"
                tick={{ fill: 'hsl(var(--text-muted))' }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="margin"
                name="Profit Margin"
                stroke="hsl(var(--warning-600))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--warning-600))', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )
    }
  }

  const getTitle = () => {
    switch (chartType) {
      case 'price':
        return 'Average Price Trend'
      case 'buybox':
        return 'Buy Box Win Rate'
      case 'revenue':
        return 'Revenue Trend'
      case 'margin':
        return 'Profit Margin Trend'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getTitle()}</CardTitle>
      </CardHeader>
      <CardContent>{renderChart()}</CardContent>
    </Card>
  )
}
