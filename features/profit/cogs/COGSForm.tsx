'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Input, Select } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import {
  CreateCOGSRequest,
  UpdateCOGSRequest,
  CostMethod,
  COGSResponse,
} from '@/services/api/cogs.api'
import { formatCurrency } from '@/utils/format'

/**
 * COGSForm component
 * 
 * Form for creating or editing COGS entries
 * Supports batch-based, time-period, and weighted average costing
 */
export interface COGSFormProps {
  initialData?: COGSResponse
  accountId: string
  sku?: string
  marketplaceId?: string
  batchId?: string
  marketplaces?: Array<{ id: string; name: string; code: string }>
  batches?: Array<{ id: string; sku: string; quantity: number; unitCost: number }>
  onSubmit: (data: CreateCOGSRequest | UpdateCOGSRequest) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  className?: string
}

export const COGSForm: React.FC<COGSFormProps> = ({
  initialData,
  accountId,
  sku,
  marketplaceId,
  batchId,
  marketplaces = [],
  batches = [],
  onSubmit,
  onCancel,
  isLoading,
  className,
}) => {
  const [formData, setFormData] = useState({
    sku: sku || initialData?.sku || '',
    accountId,
    marketplaceId: marketplaceId || initialData?.marketplaceId || '',
    batchId: batchId || initialData?.batchId || '',
    quantity: initialData?.quantity || 1,
    unitCost: initialData?.unitCost || 0,
    shipmentCost: initialData?.shipmentCost || 0,
    costMethod: initialData?.costMethod || CostMethod.WEIGHTED_AVERAGE,
    purchaseDate: initialData?.purchaseDate
      ? new Date(initialData.purchaseDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initialData) {
      setFormData({
        sku: initialData.sku,
        accountId: initialData.accountId,
        marketplaceId: initialData.marketplaceId || '',
        batchId: initialData.batchId || '',
        quantity: initialData.quantity,
        unitCost: initialData.unitCost,
        shipmentCost: initialData.shipmentCost || 0,
        costMethod: initialData.costMethod,
        purchaseDate: new Date(initialData.purchaseDate).toISOString().split('T')[0],
      })
    }
  }, [initialData])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required'
    }

    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0'
    }

    if (formData.unitCost < 0) {
      newErrors.unitCost = 'Unit cost must be non-negative'
    }

    if (formData.shipmentCost < 0) {
      newErrors.shipmentCost = 'Shipment cost must be non-negative'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    const submitData: CreateCOGSRequest | UpdateCOGSRequest = {
      ...(initialData ? {} : { sku: formData.sku }),
      ...(formData.marketplaceId ? { marketplaceId: formData.marketplaceId } : {}),
      ...(formData.batchId ? { batchId: formData.batchId } : {}),
      quantity: formData.quantity,
      unitCost: formData.unitCost,
      ...(formData.shipmentCost > 0 ? { shipmentCost: formData.shipmentCost } : {}),
      costMethod: formData.costMethod,
      purchaseDate: formData.purchaseDate,
    }

    await onSubmit(submitData)
  }

  const totalCost = formData.quantity * formData.unitCost + (formData.shipmentCost || 0)

  // Filter batches by selected SKU
  const availableBatches = batches.filter((b) => b.sku === formData.sku)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{initialData ? 'Edit COGS Entry' : 'Create COGS Entry'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!initialData && (
            <div>
              <Input
                label="SKU"
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                error={errors.sku}
                required
              />
            </div>
          )}

          {marketplaces.length > 0 && (
            <div>
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
            </div>
          )}

          {availableBatches.length > 0 && (
            <div>
              <Select
                label="Batch (Optional)"
                value={formData.batchId}
                onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                options={[
                  { value: '', label: 'No Batch' },
                  ...availableBatches.map((batch) => ({
                    value: batch.id,
                    label: `Batch: ${formatCurrency(batch.unitCost)}/unit × ${batch.quantity} units`,
                  })),
                ]}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="Quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })
                }
                error={errors.quantity}
                required
              />
            </div>
            <div>
              <Input
                label="Unit Cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.unitCost}
                onChange={(e) =>
                  setFormData({ ...formData, unitCost: parseFloat(e.target.value) || 0 })
                }
                error={errors.unitCost}
                required
              />
            </div>
          </div>

          <div>
            <Input
              label="Shipment Cost (Optional)"
              type="number"
              min="0"
              step="0.01"
              value={formData.shipmentCost}
              onChange={(e) =>
                setFormData({ ...formData, shipmentCost: parseFloat(e.target.value) || 0 })
              }
              error={errors.shipmentCost}
            />
          </div>

          <div>
            <Select
              label="Cost Method"
              value={formData.costMethod}
              onChange={(e) =>
                setFormData({ ...formData, costMethod: e.target.value as CostMethod })
              }
              options={[
                { value: CostMethod.WEIGHTED_AVERAGE, label: 'Weighted Average' },
                { value: CostMethod.BATCH, label: 'Batch' },
                { value: CostMethod.TIME_PERIOD, label: 'Time Period' },
              ]}
            />
          </div>

          <div>
            <Input
              label="Purchase Date"
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              required
            />
          </div>

          <div className="p-4 bg-secondary-50 rounded-lg">
            <div className="text-sm text-secondary-600 mb-1">Total Cost</div>
            <div className="text-2xl font-bold">{formatCurrency(totalCost)}</div>
            <div className="text-xs text-secondary-500 mt-1">
              ({formatCurrency(formData.unitCost)} × {formData.quantity}
              {formData.shipmentCost > 0 && ` + ${formatCurrency(formData.shipmentCost)} shipment`})
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" isLoading={isLoading} className="flex-1">
              {initialData ? 'Update' : 'Create'}
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

