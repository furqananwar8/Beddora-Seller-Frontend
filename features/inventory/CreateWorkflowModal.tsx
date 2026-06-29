"use client"

import React, { useState, useEffect } from 'react'
import { Modal } from '@/design-system/modals'
import { Input } from '@/design-system/inputs'
import { Select } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { useCreateWorkflowBatchMutation } from '@/services/api/resellerWorkflow.api'

interface CreateWorkflowModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (batchId: string) => void
}

/**
 * Create Workflow Modal Component
 * 
 * Modal form for creating a new workflow batch
 */
export const CreateWorkflowModal = ({ isOpen, onClose, onSuccess }: CreateWorkflowModalProps) => {
  // Generate default batch name with timestamp
  const generateBatchName = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `RW${year}-${month}-${day} ${hours}:${minutes}`
  }
  
  const [batchName, setBatchName] = useState(generateBatchName())
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [supplier, setSupplier] = useState('')
  const [channel, setChannel] = useState<'FBA' | 'FBM'>('FBA')
  const [marketplace, setMarketplace] = useState('amazon.ca')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [createBatch, { isLoading }] = useCreateWorkflowBatchMutation()
  
  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setBatchName(generateBatchName())
      setStartDate(new Date().toISOString().split('T')[0])
      setSupplier('')
      setChannel('FBA')
      setMarketplace('amazon.ca')
      setSelectedFile(null)
      setErrors({})
    }
  }, [isOpen])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    const newErrors: Record<string, string> = {}
    if (!batchName.trim()) {
      newErrors.batchName = 'Batch name is required'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      const result = await createBatch({
        name: batchName.trim(),
        fulfillmentType: channel,
        notes: `Start Date: ${startDate}, Supplier: ${supplier || 'None'}, Marketplace: ${marketplace}`,
      }).unwrap()
      
      // Call success callback with batch ID
      if (onSuccess) {
        onSuccess(result.id)
      }
      
      onClose()
    } catch (error: any) {
      setErrors({ submit: error?.data?.message || 'Failed to create workflow batch' })
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create a new batch"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Batch Name */}
        <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
          <label className="text-sm font-medium text-text-primary">Batch name</label>
          <Input
            value={batchName}
            onChange={(e) => {
              setBatchName(e.target.value)
              if (errors.batchName) {
                setErrors({ ...errors, batchName: '' })
              }
            }}
            error={errors.batchName}
            required
          />
        </div>

        {/* Start Date */}
        <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
          <label className="text-sm font-medium text-text-primary">Start date</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        {/* Supplier */}
        <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
          <label className="text-sm font-medium text-text-primary">Supplier</label>
          <Select
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            options={[
              { value: '', label: 'Select supplier (optional)' },
              { value: 'supplier1', label: 'Global Electronics Supply' },
              { value: 'supplier2', label: 'TechHub Distributors' },
              { value: 'supplier3', label: 'Prime Home Goods' },
            ]}
          />
        </div>

        {/* Channel */}
        <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
          <label className="text-sm font-medium text-text-primary">Channel</label>
          <Select
            value={channel}
            onChange={(e) => setChannel(e.target.value as 'FBA' | 'FBM')}
            options={[
              { value: 'FBA', label: 'FBA' },
              { value: 'FBM', label: 'FBM' },
            ]}
            required
          />
        </div>

        {/* Marketplace */}
        <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
          <label className="text-sm font-medium text-text-primary">Marketplace</label>
          <Select
            value={marketplace}
            onChange={(e) => setMarketplace(e.target.value)}
            options={[
              { value: 'amazon.ca', label: 'Amazon.ca' },
              { value: 'amazon.com', label: 'Amazon.com' },
              { value: 'amazon.co.uk', label: 'Amazon.co.uk' },
              { value: 'amazon.de', label: 'Amazon.de' },
            ]}
            required
          />
        </div>

        {/* Import Product Data */}
        <div className="grid grid-cols-[120px_1fr] gap-4 items-start pt-2">
          <label className="text-sm font-medium text-text-primary pt-2">Import product data</label>
          <div>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-border-primary rounded cursor-pointer hover:bg-surface-secondary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Select file or buy list
            </label>
            {selectedFile && (
              <p className="mt-2 text-sm text-text-muted">{selectedFile.name}</p>
            )}
          </div>
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="p-3 bg-danger-50 border border-danger-200 rounded-md">
            <p className="text-sm text-danger-700">{errors.submit}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create a batch
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
