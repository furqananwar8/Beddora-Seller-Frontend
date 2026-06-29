import React from 'react'
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface PPCChartProps {
  data: Array<{
    week: string
    adSpend: number
    profit: number
    acos: number
  }>
}

export default React.memo(function PPCChart({ data }: PPCChartProps) {
  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value) => `C$ ${(value / 1000).toFixed(1)}k`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value) => `${value.toFixed(0)}%`}
            domain={[0, 60]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
            }}
          />
          <Bar yAxisId="left" dataKey="adSpend" fill="#10b981" name="Ad spend" />
          <Bar yAxisId="left" dataKey="profit" fill="#3b82f6" name="Profit" />
          <Line yAxisId="right" type="monotone" dataKey="acos" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="ACOS" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
})
