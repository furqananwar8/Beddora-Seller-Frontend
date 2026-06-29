'use client'

import React, { useState, useMemo } from 'react'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import { Input, Select } from '@/design-system/inputs'
import { Card, CardContent } from '@/design-system/cards'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/design-system/tables'
import { formatCurrency } from '@/utils/format'

interface VariableExpense {
  id: string
  creationDate: string
  title: string
  calculateAs: string
  amount: number
  category: string
  conditions: string
  startDate: string
  endDate: string
}

type SortColumn = 'creationDate' | 'title' | 'amount' | 'category'
type SortDirection = 'asc' | 'desc'

export const VariableExpensesScreen: React.FC = () => {
  const [expenses, setExpenses] = useState<VariableExpense[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [productFilter, setProductFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [marketplaceFilter, setMarketplaceFilter] = useState('all')
  const [sortColumn, setSortColumn] = useState<SortColumn>('creationDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const filteredAndSortedExpenses = useMemo(() => {
    let result = [...expenses]

    // Search filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      result = result.filter((expense) => expense.title.toLowerCase().includes(lower))
    }

    // Product filter
    if (productFilter !== 'all') {
      // Filter logic here
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((expense) => expense.category === categoryFilter)
    }

    // Marketplace filter
    if (marketplaceFilter !== 'all') {
      // Filter logic here
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortColumn]
      let bVal: any = b[sortColumn]

      if (sortColumn === 'amount') {
        aVal = Number(aVal)
        bVal = Number(bVal)
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
    })

    return result
  }, [expenses, searchTerm, productFilter, categoryFilter, marketplaceFilter, sortColumn, sortDirection])

  const handleAddExpense = () => {
    // TODO: Open modal/form to add new variable expense
    console.log('Add new variable expense')
  }

  const handleEditExpense = (id: string) => {
    // TODO: Open modal/form to edit expense
    console.log('Edit expense:', id)
  }

  const handleDeleteExpense = (id: string) => {
    if (confirm('Are you sure you want to delete this variable expense?')) {
      setExpenses(expenses.filter((e) => e.id !== id))
    }
  }

  const SortIcon: React.FC<{ column: SortColumn }> = ({ column }) => (
    <span className="ml-1 inline-block text-xs">
      {sortColumn === column ? (
        sortDirection === 'asc' ? '▲' : '▼'
      ) : (
        <span className="text-text-muted">↕</span>
      )}
    </span>
  )

  return (
    <Container size="full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Variable Expenses</h1>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-surface border-b border-border mb-4">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <Input
                  type="text"
                  placeholder="Search by expense name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              {/* Product Filter */}
              <Select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All products' },
                  { value: 'product1', label: 'Product 1' },
                  { value: 'product2', label: 'Product 2' },
                ]}
                className="min-w-[140px]"
              />

              {/* Category Filter */}
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All categories' },
                  { value: 'shipping', label: 'Shipping' },
                  { value: 'packaging', label: 'Packaging' },
                  { value: 'commissions', label: 'Commissions' },
                ]}
                className="min-w-[140px]"
              />

              {/* Marketplace Filter */}
              <Select
                value={marketplaceFilter}
                onChange={(e) => setMarketplaceFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All marketplaces' },
                  { value: 'amazon-us', label: 'Amazon US' },
                  { value: 'amazon-ca', label: 'Amazon CA' },
                ]}
                className="min-w-[160px]"
              />

              {/* Filter Button */}
              <Button variant="primary">Filter</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Variable Expenses Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-surface-secondary whitespace-nowrap"
                    onClick={() => handleSort('creationDate')}
                  >
                    Creation date
                    <SortIcon column="creationDate" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-surface-secondary whitespace-nowrap"
                    onClick={() => handleSort('title')}
                  >
                    Title
                    <SortIcon column="title" />
                  </TableHead>
                  <TableHead className="whitespace-nowrap">Calculate expense as</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-surface-secondary text-right whitespace-nowrap"
                    onClick={() => handleSort('amount')}
                  >
                    Amount
                    <SortIcon column="amount" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-surface-secondary whitespace-nowrap"
                    onClick={() => handleSort('category')}
                  >
                    Category
                    <SortIcon column="category" />
                  </TableHead>
                  <TableHead className="whitespace-nowrap">Conditions</TableHead>
                  <TableHead className="whitespace-nowrap">Start</TableHead>
                  <TableHead className="whitespace-nowrap">End</TableHead>
                  <TableHead className="text-center w-12 whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedExpenses.length > 0 ? (
                  filteredAndSortedExpenses.map((expense) => (
                    <TableRow key={expense.id} className="hover:bg-surface-secondary">
                      <TableCell className="whitespace-nowrap">{expense.creationDate}</TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleEditExpense(expense.id)}
                          className="text-primary-600 hover:text-primary-700 hover:underline font-medium"
                        >
                          {expense.title}
                        </button>
                      </TableCell>
                      <TableCell>{expense.calculateAs}</TableCell>
                      <TableCell className="text-right whitespace-nowrap font-medium">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap capitalize">{expense.category}</TableCell>
                      <TableCell>{expense.conditions}</TableCell>
                      <TableCell className="whitespace-nowrap">{expense.startDate}</TableCell>
                      <TableCell className="whitespace-nowrap">{expense.endDate}</TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="p-1 hover:bg-surface-secondary transition-colors text-danger-600"
                          aria-label="Delete"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-text-muted py-12">
                      No data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Button */}
      <div className="mt-4">
        <Button variant="primary" onClick={handleAddExpense}>
          + Add Variable Expense
        </Button>
      </div>
    </Container>
  )
}
