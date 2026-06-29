"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/design-system/tables'
import { Input, Select } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { Expense, ExpenseFilters, ExpenseType } from '@/services/api/expenses.api'
import { formatCurrency, formatDate } from '@/utils/format'

export interface ExpenseTableProps {
  expenses?: Expense[]
  filters: ExpenseFilters
  onFiltersChange: (filters: ExpenseFilters) => void
  marketplaces?: Array<{ id: string; name: string; code: string }>
  isLoading?: boolean
  error?: any
  onEdit?: (expense: Expense) => void
  onDelete?: (expense: Expense) => void
  className?: string
}

export const ExpenseTable: React.FC<ExpenseTableProps> = ({
  expenses,
  filters,
  onFiltersChange,
  marketplaces = [],
  isLoading,
  error,
  onEdit,
  onDelete,
  className,
}) => {
  const [localFilters, setLocalFilters] = useState<ExpenseFilters>(filters)

  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleFilterChange = (key: keyof ExpenseFilters, value: string | undefined) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value || undefined }))
  }

  const handleApplyFilters = () => {
    onFiltersChange(localFilters)
  }

  const handleResetFilters = () => {
    const reset = { accountId: filters.accountId }
    setLocalFilters(reset)
    onFiltersChange(reset)
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 text-sm">Failed to load expenses</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              label="Type"
              value={localFilters.type || ''}
              onChange={(e) => handleFilterChange('type', e.target.value as ExpenseType)}
              options={[
                { value: '', label: 'All Types' },
                { value: 'fixed', label: 'Fixed' },
                { value: 'recurring', label: 'Recurring' },
                { value: 'one-time', label: 'One-time' },
              ]}
            />
            <Input
              label="Category"
              value={localFilters.category || ''}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              placeholder="Operations, Marketing..."
            />
            <Input
              label="SKU"
              value={localFilters.sku || ''}
              onChange={(e) => handleFilterChange('sku', e.target.value)}
              placeholder="Optional SKU"
            />
            {marketplaces.length > 0 && (
              <Select
                label="Marketplace"
                value={localFilters.marketplaceId || ''}
                onChange={(e) => handleFilterChange('marketplaceId', e.target.value)}
                options={[
                  { value: '', label: 'All Marketplaces' },
                  ...marketplaces.map((mp) => ({
                    value: mp.id,
                    label: `${mp.name} (${mp.code})`,
                  })),
                ]}
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={localFilters.startDate || ''}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={localFilters.endDate || ''}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={handleResetFilters}>
                Reset
              </Button>
              <Button onClick={handleApplyFilters}>Apply</Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Marketplace</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses && expenses.length > 0 ? (
                  expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{formatDate(expense.incurredAt)}</TableCell>
                      <TableCell className="capitalize">{expense.type}</TableCell>
                      <TableCell>{expense.category}</TableCell>
                      <TableCell>{formatCurrency(expense.amount, expense.currency)}</TableCell>
                      <TableCell>
                        {marketplaces.find((mp) => mp.id === expense.marketplaceId)?.name || '—'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {expense.description || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {onEdit && (
                            <Button variant="outline" size="sm" onClick={() => onEdit(expense)}>
                              Edit
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => onDelete(expense)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-secondary-500">
                      No expenses found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

