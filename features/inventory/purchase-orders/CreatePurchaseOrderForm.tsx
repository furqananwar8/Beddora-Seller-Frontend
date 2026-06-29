'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Input } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { PurchaseOrderCreateRequest } from '@/types/purchaseOrders.types'

export interface CreatePurchaseOrderFormProps {
  accountId: string
  onSubmit: (payload: PurchaseOrderCreateRequest) => void
  isLoading?: boolean
}

export const CreatePurchaseOrderForm: React.FC<CreatePurchaseOrderFormProps> = ({
  accountId,
  onSubmit,
  isLoading,
}) => {
  const [poNumber, setPoNumber] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [marketplaceId, setMarketplaceId] = useState('')
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('')
  const [items, setItems] = useState([
    { sku: '', quantity: 1, unitCost: 0 },
  ])

  const handleAddItem = () => {
    setItems((prev) => [...prev, { sku: '', quantity: 1, unitCost: 0 }])
  }

  const handleItemChange = (index: number, field: string, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  const handleSubmit = () => {
    if (!isFormValid) return
    onSubmit({
      accountId,
      supplierId,
      marketplaceId: marketplaceId || undefined,
      poNumber,
      estimatedDeliveryDate: estimatedDeliveryDate || undefined,
      items: items.map((item) => ({
        sku: item.sku,
        quantity: Number(item.quantity),
        unitCost: Number(item.unitCost),
      })),
    })
  }

  const isFormValid =
    Boolean(accountId) &&
    supplierId.trim().length > 0 &&
    poNumber.trim().length > 0 &&
    items.every((item) => item.sku.trim().length > 0 && Number(item.unitCost) > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Purchase Order</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="PO Number" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} />
          <Input label="Supplier ID" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} />
          <Input
            label="Marketplace ID"
            value={marketplaceId}
            onChange={(e) => setMarketplaceId(e.target.value)}
          />
          <Input
            label="Estimated Delivery Date"
            type="date"
            value={estimatedDeliveryDate}
            onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                label={index === 0 ? 'SKU' : undefined}
                value={item.sku}
                onChange={(e) => handleItemChange(index, 'sku', e.target.value)}
              />
              <Input
                label={index === 0 ? 'Quantity' : undefined}
                type="number"
                value={item.quantity}
                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
              />
              <Input
                label={index === 0 ? 'Unit Cost' : undefined}
                type="number"
                value={item.unitCost}
                onChange={(e) => handleItemChange(index, 'unitCost', e.target.value)}
              />
            </div>
          ))}
          <Button variant="outline" onClick={handleAddItem}>
            Add Item
          </Button>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={isLoading || !isFormValid}>
            {isLoading ? 'Creating...' : 'Create PO'}
          </Button>
        </div>
        {!isFormValid && (
          <div className="text-xs text-text-muted">
            Provide PO number, supplier ID, and item SKU with unit cost.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

