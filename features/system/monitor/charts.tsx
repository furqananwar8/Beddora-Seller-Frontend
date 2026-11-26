'use client'

import React from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartPalette } from '@/design-system/charts/ChartPalette'
import { cn } from '@/utils/cn'
import type { ThroughputPoint } from '@/services/api/systemMonitor.api'

/** A tiny trend line with no axes, for the number cards. */
export const Sparkline: React.FC<{ values: number[]; color?: string; width?: number; height?: number; label: string }> = ({ values, color = ChartPalette.primary, width = 110, height = 32, label }) => {
  if (values.length < 2) return <div style={{ width, height }} aria-hidden="true" />
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const points = values.map((value, i) => `${((i / (values.length - 1)) * width).toFixed(1)},${(height - 3 - ((value - min) / span) * (height - 6)).toFixed(1)}`).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

const RING_TONE = { good: 'var(--chart-success)', warn: 'var(--chart-warning)', bad: 'var(--chart-danger)', info: 'var(--chart-primary)' }

/** A circle that fills to a percentage, with a short label inside. */
export const Ring: React.FC<{ pct: number; label: string; tone?: keyof typeof RING_TONE; size?: number; stroke?: number; className?: string; ariaLabel: string }> = ({ pct, label, tone = 'good', size = 56, stroke = 6, className, ariaLabel }) => {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }} role="img" aria-label={ariaLabel}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--chart-neutral)" strokeOpacity={0.25} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={RING_TONE[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xs font-semibold text-text-primary">{label}</span>
    </div>
  )
}

/** Tasks finished and failed per minute, as two layered areas. */
export const ThroughputChart: React.FC<{ points: ThroughputPoint[] }> = ({ points }) => {
  const data = points.map((point) => ({ at: new Date(point.t).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' }), Completed: point.completed, Failed: point.failed }))
  return (
    <div className="h-56 w-full" role="img" aria-label="Tasks completed and failed per minute">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-neutral)" strokeOpacity={0.25} />
          <XAxis dataKey="at" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={32} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip />
          <Area type="monotone" dataKey="Completed" stroke={ChartPalette.success} fill={ChartPalette.success} fillOpacity={0.15} strokeWidth={2} isAnimationActive />
          <Area type="monotone" dataKey="Failed" stroke={ChartPalette.danger} fill={ChartPalette.danger} fillOpacity={0.15} strokeWidth={2} isAnimationActive />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Plain bars for a short series, such as requests per reading. */
export const MiniBars: React.FC<{ values: number[]; label: string; color?: string; height?: number }> = ({ values, label, color = ChartPalette.primary, height = 140 }) => {
  const data = values.map((value, i) => ({ i, value }))
  return (
    <div className="w-full" style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-neutral)" strokeOpacity={0.25} />
          <XAxis dataKey="i" hide />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip labelFormatter={() => ''} />
          <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
