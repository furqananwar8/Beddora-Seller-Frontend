'use client'

import React, { useState, useMemo } from 'react'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import { Input, Select } from '@/design-system/inputs'
import { Card, CardContent } from '@/design-system/cards'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/design-system/tables'
import { formatCurrency } from '@/utils/format'

interface IndirectExpense {
  id: string
  date: string
  type: 'one-time' | 'recurring'
  name: string
  category: string
  isAdvertisingCost: boolean
  product?: string
  marketplace?: string
  amount: number
  currency: string
}

export const IndirectExpensesScreen: React.FC = () => {
  const [expenses, setExpenses] = useState<IndirectExpense[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [periodFilter, setPeriodFilter] = useState('three-months')
  const [productFilter, setProductFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [marketplaceFilter, setMarketplaceFilter] = useState('all')
  const [showAddRow, setShowAddRow] = useState(true)

  // New expense form state
  const [newExpense, setNewExpense] = useState<Omit<IndirectExpense, 'id'>>({
    date: new Date().toISOString().split('T')[0],
    type: 'one-time',
    name: '',
    category: '',
    isAdvertisingCost: false,
    product: '',
    marketplace: 'all',
    amount: 0,
    currency: 'C$',
  })

  const filteredExpenses = useMemo(() => {
    let result = [...expenses]

    // Search filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      result = result.filter((expense) => expense.name.toLowerCase().includes(lower))
    }

    // Product filter
    if (productFilter !== 'all') {
      result = result.filter((expense) => expense.product === productFilter)
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter((expense) => expense.category === categoryFilter)
    }

    // Marketplace filter
    if (marketplaceFilter !== 'all') {
      result = result.filter((expense) => expense.marketplace === marketplaceFilter)
    }

    return result
  }, [expenses, searchTerm, productFilter, categoryFilter, marketplaceFilter])

  const handleAddExpense = () => {
    if (!newExpense.name || !newExpense.category) {
      alert('Please fill in expense name and category')
      return
    }

    const expense: IndirectExpense = {
      id: Date.now().toString(),
      ...newExpense,
    }

    setExpenses([...expenses, expense])

    // Reset form
    setNewExpense({
      date: new Date().toISOString().split('T')[0],
      type: 'one-time',
      name: '',
      category: '',
      isAdvertisingCost: false,
      product: '',
      marketplace: 'all',
      amount: 0,
      currency: 'C$',
    })
  }

  const handleDeleteExpense = (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      setExpenses(expenses.filter((e) => e.id !== id))
    }
  }

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <Container size="full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Indirect Expenses</h1>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-surface border-b border-border mb-4">
        <div className="px-6 py-4">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 items-center">
            {/* Search */}
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

            {/* Period Filter */}
            <div className="w-[180px]">
              <Select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                options={[
                  { value: 'three-months', label: 'Three months' },
                  { value: 'six-months', label: 'Six months' },
                  { value: 'one-year', label: 'One year' },
                  { value: 'custom', label: 'Custom period' },
                ]}
              />
            </div>

            {/* Product Filter */}
            <div className="w-[160px]">
              <Select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All products' },
                  { value: 'product1', label: 'Product 1' },
                  { value: 'product2', label: 'Product 2' },
                ]}
              />
            </div>

            {/* Category Filter */}
            <div className="w-[160px]">
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All categories' },
                  { value: 'office', label: 'Office' },
                  { value: 'marketing', label: 'Marketing' },
                  { value: 'software', label: 'Software' },
                ]}
              />
            </div>

            {/* Marketplace Filter */}
            <div className="w-[180px]">
              <Select
                value={marketplaceFilter}
                onChange={(e) => setMarketplaceFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All marketplaces' },
                  { value: 'amazon-us', label: 'Amazon US' },
                  { value: 'amazon-ca', label: 'Amazon CA' },
                ]}
              />
            </div>

            {/* Filter Button */}
            <Button variant="primary">Filter</Button>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Type</TableHead>
                  <TableHead className="whitespace-nowrap">Name</TableHead>
                  <TableHead className="whitespace-nowrap">Category</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Advertising cost</TableHead>
                  <TableHead className="whitespace-nowrap">Product</TableHead>
                  <TableHead className="whitespace-nowrap">Marketplace</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Amount</TableHead>
                  <TableHead className="text-center w-12 whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Add New Expense Row */}
                {showAddRow && (
                  <TableRow className="bg-surface-secondary">
                    {/* Date */}
                    <TableCell>
                      <Input
                        type="date"
                        value={newExpense.date}
                        onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                        className="min-w-[140px]"
                      />
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <Select
                        value={newExpense.type}
                        onChange={(e) =>
                          setNewExpense({
                            ...newExpense,
                            type: e.target.value as 'one-time' | 'recurring',
                          })
                        }
                        options={[
                          { value: 'one-time', label: 'One-Time' },
                          { value: 'recurring', label: 'Recurring' },
                        ]}
                        className="min-w-[120px]"
                      />
                    </TableCell>

                    {/* Name */}
                    <TableCell>
                      <Input
                        type="text"
                        placeholder="Add new expense"
                        value={newExpense.name}
                        onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                        className="min-w-[200px]"
                      />
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      <Select
                        value={newExpense.category}
                        onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                        options={[
                          { value: '', label: 'Select a category' },
                          { value: 'office', label: 'Office' },
                          { value: 'marketing', label: 'Marketing' },
                          { value: 'software', label: 'Software' },
                          { value: 'rent', label: 'Rent' },
                          { value: 'utilities', label: 'Utilities' },
                          { value: 'insurance', label: 'Insurance' },
                          { value: 'other', label: 'Other' },
                        ]}
                        className="min-w-[150px]"
                      />
                    </TableCell>

                    {/* Advertising Cost Checkbox */}
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={newExpense.isAdvertisingCost}
                        onChange={(e) =>
                          setNewExpense({ ...newExpense, isAdvertisingCost: e.target.checked })
                        }
                        className="cursor-pointer"
                      />
                    </TableCell>

                    {/* Product */}
                    <TableCell>
                      <Input
                        type="text"
                        placeholder="Search by name, tag, SKU, ASIN, EAN, UPC"
                        value={newExpense.product}
                        onChange={(e) => setNewExpense({ ...newExpense, product: e.target.value })}
                        className="min-w-[250px]"
                      />
                    </TableCell>

                    {/* Marketplace */}
                    <TableCell>
                      <Select
                        value={newExpense.marketplace}
                        onChange={(e) =>
                          setNewExpense({ ...newExpense, marketplace: e.target.value })
                        }
                        options={[
                          { value: 'all', label: 'All marketplaces' },
                          { value: 'amazon-us', label: 'Amazon US' },
                          { value: 'amazon-ca', label: 'Amazon CA' },
                        ]}
                        className="min-w-[150px]"
                      />
                    </TableCell>

                    {/* Amount */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={newExpense.currency}
                          onChange={(e) =>
                            setNewExpense({ ...newExpense, currency: e.target.value })
                          }
                          options={[
                            { value: 'C$', label: 'C$' },
                            { value: 'US$', label: 'US$' },
                            { value: 'EUR', label: 'EUR' },
                          ]}
                          className="min-w-[80px]"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          value={newExpense.amount}
                          onChange={(e) =>
                            setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })
                          }
                          className="min-w-[100px] text-right"
                        />
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-center">
                      <Button variant="primary" size="sm" onClick={handleAddExpense}>
                        Add
                      </Button>
                    </TableCell>
                  </TableRow>
                )}

                {/* Existing Expenses */}
                {filteredExpenses.length > 0 ? (
                  filteredExpenses.map((expense) => (
                    <TableRow key={expense.id} className="hover:bg-surface-secondary">
                      <TableCell className="whitespace-nowrap">{expense.date}</TableCell>
                      <TableCell className="whitespace-nowrap capitalize">{expense.type}</TableCell>
                      <TableCell>{expense.name}</TableCell>
                      <TableCell className="whitespace-nowrap capitalize">{expense.category}</TableCell>
                      <TableCell className="text-center">
                        {expense.isAdvertisingCost && (
                          <svg
                            className="w-4 h-4 mx-auto text-success-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </TableCell>
                      <TableCell>{expense.product || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap capitalize">
                        {expense.marketplace === 'all' ? 'All' : expense.marketplace}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap font-medium">
                        {expense.currency} {formatCurrency(expense.amount, expense.currency)}
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="p-1 hover:bg-surface-secondary transition-colors text-danger-600"
                          aria-label="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  !showAddRow && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-text-muted py-8">
                        No indirect expenses found. Click the button above to add your first expense.
                      </TableCell>
                    </TableRow>
                  )
                )}

                {/* Total Row */}
                {filteredExpenses.length > 0 && (
                  <TableRow className="bg-surface-secondary font-semibold">
                    <TableCell colSpan={7} className="text-right">
                      Total:
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatCurrency(totalAmount)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </Container>
  )
}
