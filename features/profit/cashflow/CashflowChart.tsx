import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface CashflowChartProps {
  data: Array<{
    date: string
    fullDate?: string
    cashOnHand: number
    series2?: number
    series3?: number
  }>
}

export default React.memo(function CashflowChart({ data }: CashflowChartProps) {
  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickMargin={10}
            interval="preserveStartEnd"
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            tickFormatter={(value) => {
              if (value >= 0) return `C$ ${(value / 1000).toFixed(1)}k`
              return `-C$ ${Math.abs(value / 1000).toFixed(1)}k`
            }}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
            }}
            formatter={(value: any) => {
              const num = parseFloat(value)
              if (num >= 0) return [`C$ ${num.toFixed(2)}`, '']
              return [`-C$ ${Math.abs(num).toFixed(2)}`, '']
            }}
            labelFormatter={(label) => {
              const item = data.find((d) => d.date === label)
              return item?.fullDate || label
            }}
          />
          <Line
            type="monotone"
            dataKey="cashOnHand"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4, fill: '#3b82f6' }}
            activeDot={{ r: 6 }}
            name="Cash on Hand"
          />
          {data[0]?.series2 !== undefined && (
            <Line
              type="monotone"
              dataKey="series2"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 4, fill: '#10b981' }}
              activeDot={{ r: 6 }}
              name="Income"
            />
          )}
          {data[0]?.series3 !== undefined && (
            <Line
              type="monotone"
              dataKey="series3"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 4, fill: '#ef4444' }}
              activeDot={{ r: 6 }}
              name="Expenses"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
})
