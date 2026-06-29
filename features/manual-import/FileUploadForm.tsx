'use client'

import React, { useState } from 'react'
import { useUploadFileMutation } from '@/services/api/import.api'
import { useGetAmazonAccountsQuery } from '@/services/api/accounts.api'
import { Button } from '@/design-system/buttons'
import { Card } from '@/design-system/cards'
import { Select } from '@/design-system/inputs'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setCurrentImport,
  setUploading,
  setUploadError,
  setStagingRows,
} from '@/store/manualImport.slice'
import type { ImportType } from '@/store/manualImport.slice'

/**
 * FileUploadForm Component
 * 
 * Form for uploading CSV/Excel files for manual data import
 * Features:
 * - File selection and validation
 * - Account and import type selection
 * - Upload progress and error handling
 */

const IMPORT_TYPES: Array<{ label: string; value: ImportType }> = [
  { label: 'Orders', value: 'orders' },
  { label: 'Fees', value: 'fees' },
  { label: 'PPC Metrics', value: 'ppc' },
  { label: 'Inventory', value: 'inventory' },
  { label: 'Listings', value: 'listings' },
  { label: 'Refunds', value: 'refunds' },
]

export const FileUploadForm: React.FC = () => {
  const dispatch = useAppDispatch()
  const activeAccountId = useAppSelector((state) => state.accounts.activeAmazonAccountId)
  const { data: accounts } = useGetAmazonAccountsQuery()
  const [uploadFile, { isLoading }] = useUploadFileMutation()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState<string>(activeAccountId || '')
  const [selectedType, setSelectedType] = useState<ImportType>('orders')
  const [error, setError] = useState<string | null>(null)

  const selectedAccount = accounts?.find((acc) => acc.id === selectedAccountId)

  /**
   * Handle file selection
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
      setError('Invalid file type. Please upload a CSV or Excel file.')
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit.')
      return
    }

    setSelectedFile(file)
    setError(null)
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedFile) {
      setError('Please select a file')
      return
    }

    if (!selectedAccountId) {
      setError('Please select an Amazon account')
      return
    }

    if (!selectedAccount) {
      setError('Selected account not found')
      return
    }

    try {
      dispatch(setUploading(true))
      dispatch(
        setCurrentImport({
          type: selectedType,
          amazonAccountId: selectedAccountId,
          marketplaceId: selectedAccount.marketplace,
          file: selectedFile,
        })
      )

      const result = await uploadFile({
        file: selectedFile,
        amazonAccountId: selectedAccountId,
        marketplaceId: selectedAccount.marketplace,
        importType: selectedType,
      }).unwrap()

      // Fetch staging rows after upload
      // This will be handled by the parent component or a hook

      alert(
        `File uploaded successfully!\n${result.data.validRows} valid rows, ${result.data.invalidRows} invalid rows`
      )

      // Reset form
      setSelectedFile(null)
      const fileInput = document.getElementById('file-input') as HTMLInputElement
      if (fileInput) {
        fileInput.value = ''
      }
    } catch (err: any) {
      const errorMessage = err?.data?.error || err?.message || 'Upload failed'
      setError(errorMessage)
      dispatch(setUploadError(errorMessage))
    } finally {
      dispatch(setUploading(false))
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Upload Data File</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Import Type"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as ImportType)}
          options={IMPORT_TYPES.map((t) => ({ label: t.label, value: t.value }))}
          required
        />

        <Select
          label="Amazon Account"
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          options={[
            { label: 'Select an account', value: '' },
            ...(accounts || []).map((acc) => ({
              label: `${acc.marketplace} - ${acc.sellerId}`,
              value: acc.id,
            })),
          ]}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            File (CSV or Excel)
          </label>
          <input
            id="file-input"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            required
          />
          {selectedFile && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <Button type="submit" isLoading={isLoading} disabled={isLoading || !selectedFile}>
          Upload and Parse
        </Button>
      </form>
    </Card>
  )
}

