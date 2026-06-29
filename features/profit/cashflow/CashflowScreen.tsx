'use client'

import React, { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import { Select } from '@/design-system/inputs'
import { Card, CardContent } from '@/design-system/cards'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/design-system/tables'

// Lazy load chart component
const CashflowChart = dynamic(() => import('./CashflowChart'), {
  loading: () => <div className="w-full h-96 flex items-center justify-center bg-surface"><span className="text-text-muted">Loading chart...</span></div>,
  ssr: false
})

interface CashflowTransaction {
  id: string
  date: string
  description: string
  type: string
  sum: number
  cashOnHand: number
}

interface CashflowPeriod {
  id: string
  dateRange: string
  transactions: CashflowTransaction[]
  difference: number
}

export const CashflowScreen: React.FC = () => {
  const [periodFilter, setPeriodFilter] = useState('last_12_months_payout')
  const [showConfigModal, setShowConfigModal] = useState(false)

  // Sample cashflow data
  const cashflowPeriods: CashflowPeriod[] = [
    {
      id: '1',
      dateRange: '01/03/2025 - 03/03/2025',
      transactions: [
        {
          id: '1',
          date: '03/03/2025',
          description: '03/03/2025 - C$5.33',
          type: 'Payout',
          sum: 5.33,
          cashOnHand: 5.33,
        },
      ],
      difference: 5.33,
    },
    {
      id: '2',
      dateRange: '04/03/2025 - 17/03/2025',
      transactions: [
        {
          id: '2',
          date: '17/03/2025',
          description: '17/03/2025 - C$-41.91',
          type: 'Payout',
          sum: -41.91,
          cashOnHand: -36.58,
        },
      ],
      difference: -41.91,
    },
  ]

  // Sample chart data - simulating the full year data from the reference
  const chartData = useMemo(() => {
    const data = []
    const startDate = new Date('2024-03-01')
    
    // Generate monthly data points
    for (let i = 0; i < 50; i++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + (i * 7)) // Weekly intervals
      
      // Simulate three series with different patterns
      const cashOnHand = i < 20 
        ? Math.random() * 5000 - 2000 
        : 2000 + (i - 20) * 1500 + Math.random() * 2000
      
      const series2 = i < 15 
        ? Math.random() * 1000 
        : i < 35 
          ? 500 + Math.random() * 1500 
          : Math.random() * 1000
      
      const series3 = i < 25 
        ? Math.random() * 500 
        : 500 + (i - 25) * 100 + Math.random() * 500
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }),
        fullDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        cashOnHand: Math.round(cashOnHand * 100) / 100,
        series2: Math.round(series2 * 100) / 100,
        series3: Math.round(series3 * 100) / 100,
      })
    }
    
    return data
  }, [])

  const handleDelete = (periodId: string, transactionId: string) => {
    console.log('Delete transaction:', transactionId, 'from period:', periodId)
  }

  const handleImport = () => {
    console.log('Import cashflow data')
  }

  const handleExport = () => {
    console.log('Export cashflow data')
  }

  const handleAdd = () => {
    console.log('Add new transaction')
  }

  const formatCurrency = (value: number) => {
    const formatted = Math.abs(value).toFixed(2)
    return value < 0 ? `-C$ ${formatted}` : `C$ ${formatted}`
  }

  return (
    <Container size="full">
      {/* Page Header with Period Filter */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text-primary">Cashflow</h1>
          <button
            onClick={() => setShowConfigModal(true)}
            className="p-2 hover:bg-surface-secondary transition-colors"
            aria-label="Configuration"
          >
            <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Period Filter */}
      <div className="mb-6">
        <Select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          options={[
            { value: 'last_12_months_payout', label: 'Last 12 months by payout' },
            { value: 'last_6_months_payout', label: 'Last 6 months by payout' },
            { value: 'last_3_months_payout', label: 'Last 3 months by payout' },
            { value: 'last_12_months_date', label: 'Last 12 months by date' },
            { value: 'last_6_months_date', label: 'Last 6 months by date' },
            { value: 'last_3_months_date', label: 'Last 3 months by date' },
          ]}
          className="max-w-xs"
        />
      </div>

      {/* Cashflow Chart */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <CashflowChart data={chartData} />
        </CardContent>
      </Card>

      {/* Cashflow Periods */}
      <div className="space-y-8">
        {cashflowPeriods.map((period) => (
          <div key={period.id}>
            {/* Date Range Header */}
            <h3 className="text-base font-medium text-text-primary mb-4">{period.dateRange}</h3>

            {/* Transactions Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Date</TableHead>
                        <TableHead className="whitespace-nowrap">Description</TableHead>
                        <TableHead className="whitespace-nowrap">Type</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Sum</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Cash on Hand</TableHead>
                        <TableHead className="whitespace-nowrap text-center w-20">Delete</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Transaction Rows */}
                      {period.transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="whitespace-nowrap">{transaction.date}</TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>{transaction.type}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <span className={transaction.sum < 0 ? 'text-red-600' : ''}>
                              {formatCurrency(transaction.sum)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <span className={transaction.cashOnHand < 0 ? 'text-red-600' : ''}>
                              {formatCurrency(transaction.cashOnHand)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <button
                              onClick={() => handleDelete(period.id, transaction.id)}
                              className="text-text-muted hover:text-red-600 transition-colors p-1"
                              aria-label="Delete transaction"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Difference Row */}
                      <TableRow className="bg-surface-secondary border-t-2 border-border">
                        <TableCell colSpan={3} className="font-medium">
                          Difference
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap font-medium">
                          <span className={period.difference < 0 ? 'text-red-600' : ''}>
                            {formatCurrency(period.difference)}
                          </span>
                        </TableCell>
                        <TableCell colSpan={2}></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center gap-3">
        <Button variant="secondary" onClick={handleImport}>
          Import
        </Button>
        <Button variant="secondary" onClick={handleExport}>
          Export
        </Button>
        <Button variant="primary" onClick={handleAdd}>
          Add
        </Button>
      </div>
    </Container>
  )
}
