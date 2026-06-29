'use client'

import React, { useState, useEffect } from 'react'
import {
  useLinkAmazonAccountMutation,
  useUpdateAmazonAccountMutation,
  useGetAmazonAccountsQuery,
  AmazonAccount,
  LinkAmazonAccountRequest,
  UpdateAmazonAccountRequest,
} from '@/services/api/accounts.api'
import { Input, Select } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { Card } from '@/design-system/cards'
import { useAppDispatch } from '@/store/hooks'
import { addAmazonAccount, updateAmazonAccount } from '@/store/accounts.slice'

/**
 * Marketplace options
 * Standard Amazon marketplace codes
 */
const MARKETPLACES = [
  { label: 'United States', value: 'US' },
  { label: 'Canada', value: 'CA' },
  { label: 'Mexico', value: 'MX' },
  { label: 'Brazil', value: 'BR' },
  { label: 'United Kingdom', value: 'UK' },
  { label: 'Germany', value: 'DE' },
  { label: 'France', value: 'FR' },
  { label: 'Italy', value: 'IT' },
  { label: 'Spain', value: 'ES' },
  { label: 'Netherlands', value: 'NL' },
  { label: 'Sweden', value: 'SE' },
  { label: 'Poland', value: 'PL' },
  { label: 'Japan', value: 'JP' },
  { label: 'Australia', value: 'AU' },
  { label: 'India', value: 'IN' },
  { label: 'Singapore', value: 'SG' },
  { label: 'United Arab Emirates', value: 'AE' },
  { label: 'Saudi Arabia', value: 'SA' },
  { label: 'Turkey', value: 'TR' },
  { label: 'Egypt', value: 'EG' },
]

interface AccountFormProps {
  /**
   * If provided, the form will be in edit mode for this account
   */
  accountId?: string
  /**
   * Callback when form is successfully submitted
   */
  onSuccess?: () => void
  /**
   * Callback when form is cancelled
   */
  onCancel?: () => void
}

/**
 * AccountForm Component
 * 
 * Form for linking or updating Amazon Seller Central accounts
 * Features:
 * - Add new account with credentials
 * - Edit existing account credentials
 * - Validation and error handling
 * - Marketplace selection
 */
export const AccountForm: React.FC<AccountFormProps> = ({ accountId, onSuccess, onCancel }) => {
  const isEditMode = !!accountId
  const dispatch = useAppDispatch()

  // Fetch existing account if in edit mode
  const { data: accounts } = useGetAmazonAccountsQuery()
  const existingAccount = accounts?.find((acc) => acc.id === accountId)

  // Form state
  const [formData, setFormData] = useState<LinkAmazonAccountRequest>({
    marketplace: 'US',
    sellerId: '',
    accessKey: '',
    secretKey: '',
    refreshToken: '',
  })

  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Mutations
  const [linkAccount, { isLoading: isLinking }] = useLinkAmazonAccountMutation()
  const [updateAccount, { isLoading: isUpdating }] = useUpdateAmazonAccountMutation()

  // Load existing account data in edit mode
  useEffect(() => {
    if (existingAccount) {
      setFormData({
        marketplace: existingAccount.marketplace,
        sellerId: existingAccount.sellerId,
        accessKey: '', // Never pre-fill credentials for security
        secretKey: '',
        refreshToken: '',
      })
    }
  }, [existingAccount])

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (isEditMode && accountId) {
        // Update existing account
        // Only send fields that have been changed
        const updateData: UpdateAmazonAccountRequest = {}

        if (formData.sellerId !== existingAccount?.sellerId) {
          updateData.sellerId = formData.sellerId
        }
        if (formData.accessKey) {
          updateData.accessKey = formData.accessKey
        }
        if (formData.secretKey) {
          updateData.secretKey = formData.secretKey
        }
        if (formData.refreshToken) {
          updateData.refreshToken = formData.refreshToken
        }

        // Only update if there are changes
        if (Object.keys(updateData).length === 0) {
          setError('No changes to save')
          setIsSubmitting(false)
          return
        }

        const result = await updateAccount({ id: accountId, data: updateData }).unwrap()
        dispatch(updateAmazonAccount(result))
        onSuccess?.()
      } else {
        // Link new account
        const result = await linkAccount(formData).unwrap()
        dispatch(addAmazonAccount(result))

        // Reset form
        setFormData({
          marketplace: 'US',
          sellerId: '',
          accessKey: '',
          secretKey: '',
          refreshToken: '',
        })
        onSuccess?.()
      }
    } catch (err: any) {
      setError(err?.data?.error || err?.message || 'Failed to save account')
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * Handle input change
   */
  const handleChange = (field: keyof LinkAmazonAccountRequest, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError(null) // Clear error on input change
  }

  const isLoading = isLinking || isUpdating || isSubmitting

  return (
    <Card className="p-6 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">
          {isEditMode ? 'Update Amazon Account' : 'Link Amazon Account'}
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          {isEditMode
            ? 'Update your Amazon Seller Central account credentials. Leave credential fields empty to keep existing values.'
            : 'Link your Amazon Seller Central account to start syncing data.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Marketplace"
          value={formData.marketplace}
          onChange={(e) => handleChange('marketplace', e.target.value)}
          options={MARKETPLACES}
          disabled={isEditMode} // Marketplace cannot be changed after linking
          required={!isEditMode}
        />

        <Input
          label="Seller ID"
          value={formData.sellerId}
          onChange={(e) => handleChange('sellerId', e.target.value)}
          placeholder="A1B2C3D4E5F6G7"
          required
        />

        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            {isEditMode
              ? 'Leave credential fields empty to keep existing values. Fill only the fields you want to update.'
              : 'Enter your Amazon LWA (Login with Amazon) credentials.'}
          </p>
        </div>

        <Input
          label="Access Key (LWA)"
          value={formData.accessKey}
          onChange={(e) => handleChange('accessKey', e.target.value)}
          type="password"
          placeholder={isEditMode ? 'Leave empty to keep existing' : 'Enter access key'}
          required={!isEditMode}
        />

        <Input
          label="Secret Key (LWA)"
          value={formData.secretKey}
          onChange={(e) => handleChange('secretKey', e.target.value)}
          type="password"
          placeholder={isEditMode ? 'Leave empty to keep existing' : 'Enter secret key'}
          required={!isEditMode}
        />

        <Input
          label="Refresh Token"
          value={formData.refreshToken}
          onChange={(e) => handleChange('refreshToken', e.target.value)}
          type="password"
          placeholder={isEditMode ? 'Leave empty to keep existing' : 'Enter refresh token'}
          required={!isEditMode}
        />

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button type="submit" isLoading={isLoading} disabled={isLoading}>
            {isEditMode ? 'Update Account' : 'Link Account'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
