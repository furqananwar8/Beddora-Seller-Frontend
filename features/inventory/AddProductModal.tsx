"use client"

import React, { useState } from 'react'
import { Modal } from '@/design-system/modals'
import { Input } from '@/design-system/inputs'
import { Select } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { useAddProductToBatchMutation } from '@/services/api/resellerWorkflow.api'
import { ProductCondition } from '@/services/api/resellerWorkflow.api'

interface AddProductModalProps {
  isOpen: boolean
  onClose: () => void
  batchId: string
  batchName: string
  onSuccess?: () => void
}

/**
 * Add Product Modal Component
 * 
 * Modal form for adding products to a workflow batch
 */
export const AddProductModal = ({
  isOpen,
  onClose,
  batchId,
  batchName,
  onSuccess,
}: AddProductModalProps) => {
  const [searchType, setSearchType] = useState<'barcode' | 'asin' | 'sku'>('barcode')
  const [searchValue, setSearchValue] = useState('')
  const [condition, setCondition] = useState<ProductCondition>('new')
  const [quantity, setQuantity] = useState('1')
  const [costOfGoods, setCostOfGoods] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [addProduct, { isLoading }] = useAddProductToBatchMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    const newErrors: Record<string, string> = {}
    if (!searchValue.trim()) {
      newErrors.search = `${searchType.toUpperCase()} is required`
    }
    if (!quantity || parseInt(quantity) < 1) {
      newErrors.quantity = 'Quantity must be at least 1'
    }
    if (!costOfGoods || parseFloat(costOfGoods) < 0) {
      newErrors.costOfGoods = 'Cost of goods must be 0 or greater'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      const productData: any = {
        condition,
        quantity: parseInt(quantity),
        costOfGoods: parseFloat(costOfGoods),
        notes: notes.trim() || undefined,
      }

      // Add the appropriate identifier
      if (searchType === 'barcode') {
        productData.barcode = searchValue.trim()
      } else if (searchType === 'asin') {
        productData.asin = searchValue.trim()
      } else {
        productData.sku = searchValue.trim()
      }

      await addProduct({
        batchId,
        product: productData,
      }).unwrap()

      // Reset form
      setSearchValue('')
      setCondition('new')
      setQuantity('1')
      setCostOfGoods('')
      setNotes('')
      setErrors({})

      // Call success callback
      if (onSuccess) {
        onSuccess()
      }

      onClose()
    } catch (error: any) {
      setErrors({ submit: error?.data?.message || 'Failed to add product' })
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setSearchValue('')
      setCondition('new')
      setQuantity('1')
      setCostOfGoods('')
      setNotes('')
      setErrors({})
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Add Products to ${batchName}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Search Type */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Search By
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['barcode', 'asin', 'sku'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSearchType(type)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  searchType === type
                    ? 'bg-primary-600 text-white'
                    : 'bg-surface-secondary text-text-primary hover:bg-surface-tertiary'
                }`}
              >
                {type === 'barcode' ? 'Barcode' : type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div>
          <Input
            label={`${searchType === 'barcode' ? 'Barcode' : searchType.toUpperCase()}`}
            placeholder={
              searchType === 'barcode'
                ? 'Scan or enter barcode...'
                : searchType === 'asin'
                ? 'Enter ASIN (e.g., B08N5WRWNW)'
                : 'Enter SKU'
            }
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value)
              if (errors.search) {
                setErrors({ ...errors, search: '' })
              }
            }}
            error={errors.search}
            required
            autoFocus
          />
        </div>

        {/* Condition */}
        <div>
          <Select
            label="Condition"
            value={condition}
            onChange={(e) => setCondition(e.target.value as ProductCondition)}
            options={[
              { value: 'new', label: 'New' },
              { value: 'like_new', label: 'Like New' },
              { value: 'very_good', label: 'Very Good' },
              { value: 'good', label: 'Good' },
              { value: 'acceptable', label: 'Acceptable' },
            ]}
            required
          />
        </div>

        {/* Quantity and COGS */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              label="Quantity"
              type="number"
              min="1"
              placeholder="1"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value)
                if (errors.quantity) {
                  setErrors({ ...errors, quantity: '' })
                }
              }}
              error={errors.quantity}
              required
            />
          </div>
          <div>
            <Input
              label="Cost of Goods (COGS)"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={costOfGoods}
              onChange={(e) => {
                setCostOfGoods(e.target.value)
                if (errors.costOfGoods) {
                  setErrors({ ...errors, costOfGoods: '' })
                }
              }}
              error={errors.costOfGoods}
              required
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Notes <span className="text-text-muted">(Optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this product..."
            rows={2}
            className="w-full px-3 py-2 text-sm bg-surface-primary border border-border-primary rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600 resize-none"
          />
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="p-3 bg-danger-50 border border-danger-200 rounded-md">
            <p className="text-sm text-danger-700">{errors.submit}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-primary">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Adding...
              </>
            ) : (
              'Add Product'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
