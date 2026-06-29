"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Input, Select, Textarea } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import {
  AllocatedProduct,
  CreateExpenseRequest,
  Expense,
  ExpenseType,
  UpdateExpenseRequest,
} from '@/services/api/expenses.api'

export interface ExpenseFormProps {
  accountId: string
  marketplaces?: Array<{ id: string; name: string; code: string }>
  initialData?: Expense
  onSubmit: (data: CreateExpenseRequest | UpdateExpenseRequest) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  className?: string
}

const parseAllocatedProducts = (value: string): AllocatedProduct[] | undefined => {
  if (!value.trim()) return undefined

  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed
    }
  } catch {
    // Fall through to manual parsing
  }

  // Format: SKU1:50,SKU2:50
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [sku, pct] = part.split(':')
      return {
        sku: sku?.trim(),
        percentage: Number(pct),
      }
    })
    .filter((entry) => entry.sku && entry.percentage > 0)
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  accountId,
  marketplaces = [],
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  className,
}) => {
  const [formData, setFormData] = useState({
    marketplaceId: initialData?.marketplaceId || '',
    type: (initialData?.type || 'one-time') as ExpenseType,
    category: initialData?.category || '',
    amount: initialData?.amount || 0,
    currency: initialData?.currency || 'USD',
    allocatedProducts: initialData?.allocatedProducts
      ? JSON.stringify(initialData.allocatedProducts)
      : '',
    description: initialData?.description || '',
    incurredAt: initialData?.incurredAt
      ? new Date(initialData.incurredAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        marketplaceId: initialData.marketplaceId || '',
        type: initialData.type,
        category: initialData.category,
        amount: initialData.amount,
        currency: initialData.currency,
        allocatedProducts: initialData.allocatedProducts
          ? JSON.stringify(initialData.allocatedProducts)
          : '',
        description: initialData.description || '',
        incurredAt: new Date(initialData.incurredAt).toISOString().split('T')[0],
      })
    }
  }, [initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const allocatedProducts = parseAllocatedProducts(formData.allocatedProducts)

    const payload = {
      accountId,
      marketplaceId: formData.marketplaceId || undefined,
      type: formData.type,
      category: formData.category,
      amount: Number(formData.amount),
      currency: formData.currency,
      allocatedProducts,
      description: formData.description || undefined,
      incurredAt: formData.incurredAt,
    }

    await onSubmit(initialData ? (payload as UpdateExpenseRequest) : (payload as CreateExpenseRequest))
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{initialData ? 'Edit Expense' : 'Add Expense'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {marketplaces.length > 0 && (
            <Select
              label="Marketplace (Optional)"
              value={formData.marketplaceId}
              onChange={(e) => setFormData({ ...formData, marketplaceId: e.target.value })}
              options={[
                { value: '', label: 'No Marketplace' },
                ...marketplaces.map((mp) => ({
                  value: mp.id,
                  label: `${mp.name} (${mp.code})`,
                })),
              ]}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Expense Type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as ExpenseType })}
              options={[
                { value: 'fixed', label: 'Fixed' },
                { value: 'recurring', label: 'Recurring' },
                { value: 'one-time', label: 'One-time' },
              ]}
            />

            <Input
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Amount"
              type="number"
              min="0"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              required
            />
            <Input
              label="Currency"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
              required
            />
            <Input
              label="Incurred At"
              type="date"
              value={formData.incurredAt}
              onChange={(e) => setFormData({ ...formData, incurredAt: e.target.value })}
              required
            />
          </div>

          <Textarea
            label="Allocated Products (Optional)"
            placeholder='Format: SKU1:50,SKU2:50 or [{"sku":"SKU1","percentage":50}]'
            value={formData.allocatedProducts}
            onChange={(e) => setFormData({ ...formData, allocatedProducts: e.target.value })}
          />

          <Textarea
            label="Description (Optional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div className="flex gap-2 pt-4">
            <Button type="submit" isLoading={isLoading} className="flex-1">
              {initialData ? 'Update' : 'Add'} Expense
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

