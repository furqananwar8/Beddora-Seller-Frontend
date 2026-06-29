'use client'

import React, { useState, useEffect } from 'react'
import { Modal } from '@/design-system/modals'
import { Button } from '@/design-system/buttons'
import { Input, Select } from '@/design-system/inputs'

interface ShippingProfileModalProps {
  isOpen: boolean
  onClose: () => void
  profile?: {
    id: string
    name: string
    period: string
    products: string
    calculationRule: string
  }
  onSave: (profile: {
    id?: string
    name: string
    period: string
    products: string
    calculationRule: string
  }) => void
}

export const ShippingProfileModal: React.FC<ShippingProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    period: 'unlimited',
    products: 'default',
    calculationRule: 'client_charged',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        period: profile.period.toLowerCase(),
        products: 'default',
        calculationRule: 'client_charged',
      })
    } else {
      setFormData({
        name: '',
        period: 'unlimited',
        products: 'default',
        calculationRule: 'client_charged',
      })
    }
    setErrors({})
  }, [profile, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) {
      newErrors.name = 'Profile name is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSave({
      ...(profile?.id && { id: profile.id }),
      name: formData.name,
      period: formData.period === 'unlimited' ? 'Unlimited' : 'Custom Period',
      products: formData.products === 'default' ? 'Selected products: Default' : 'Custom Selection',
      calculationRule:
        formData.calculationRule === 'client_charged'
          ? 'Shipping cost equals amount client is charged'
          : 'Custom calculation rule',
    })

    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="bg-surface">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">
              {profile ? 'Edit Shipping Profile' : 'Add New Shipping Profile'}
            </h2>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors p-1"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {/* Profile Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-1">
                Profile Name <span className="text-danger-600">*</span>
              </label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Default, FBA Standard, Heavy Items"
                error={errors.name}
              />
              {errors.name && <p className="mt-1 text-sm text-danger-600">{errors.name}</p>}
            </div>

            {/* Period */}
            <div>
              <label htmlFor="period" className="block text-sm font-medium text-text-secondary mb-1">
                Period
              </label>
              <Select
                id="period"
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                options={[
                  { value: 'unlimited', label: 'Unlimited' },
                  { value: 'custom', label: 'Custom Period' },
                ]}
              />
            </div>

            {/* Products */}
            <div>
              <label htmlFor="products" className="block text-sm font-medium text-text-secondary mb-1">
                Products
              </label>
              <Select
                id="products"
                value={formData.products}
                onChange={(e) => setFormData({ ...formData, products: e.target.value })}
                options={[
                  { value: 'default', label: 'Default (All Products)' },
                  { value: 'custom', label: 'Select Specific Products' },
                ]}
              />
            </div>

            {/* Calculation Rule */}
            <div>
              <label
                htmlFor="calculationRule"
                className="block text-sm font-medium text-text-secondary mb-1"
              >
                Shipping Cost Calculation Rule
              </label>
              <Select
                id="calculationRule"
                value={formData.calculationRule}
                onChange={(e) => setFormData({ ...formData, calculationRule: e.target.value })}
                options={[
                  { value: 'client_charged', label: 'Amount Client is Charged' },
                  { value: 'actual_cost', label: 'Actual Shipping Cost' },
                  { value: 'custom', label: 'Custom Rule' },
                ]}
              />
              <p className="mt-1 text-xs text-text-muted">
                Determines how shipping costs are calculated and tracked in profit reports
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {profile ? 'Save Changes' : 'Create Profile'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
