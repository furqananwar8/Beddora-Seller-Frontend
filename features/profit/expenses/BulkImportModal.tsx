"use client"

import React, { useState } from 'react'
import { Modal } from '@/design-system/modals'
import { Button } from '@/design-system/buttons'

export interface BulkImportModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  onImport: (payload: { accountId: string; file: File }) => Promise<void>
  isLoading?: boolean
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  accountId,
  onImport,
  isLoading,
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a file to upload')
      return
    }

    setError(null)
    await onImport({ accountId, file })
    setFile(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Import Expenses" size="md">
      <div className="space-y-4">
        <div className="text-sm text-secondary-600">
          Upload a CSV or Excel file with columns: type, category, amount, currency, incurredAt,
          marketplaceId, allocatedProducts, description.
        </div>

        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-secondary-600"
        />

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isLoading}>
            Import
          </Button>
        </div>
      </div>
    </Modal>
  )
}

