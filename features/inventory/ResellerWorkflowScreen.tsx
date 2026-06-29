"use client"

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import { useGetWorkflowBatchesQuery, ResellerWorkflowBatch } from '@/services/api/resellerWorkflow.api'
import { CreateWorkflowModal } from './CreateWorkflowModal'
import { WorkflowBatchesTable } from './WorkflowBatchesTable'
import { AddProductModal } from './AddProductModal'
import { ViewBatchModal } from './ViewBatchModal'
import { mockWorkflowBatches } from './mockResellerWorkflow'

/**
 * Reseller Workflow Screen Component
 *
 * Main screen for reseller workflow management
 * Shows empty state when no workflows exist, or list of workflows
 */
export const ResellerWorkflowScreen = () => {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [showViewBatchModal, setShowViewBatchModal] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<ResellerWorkflowBatch | null>(null)

  // API Query - skip if backend not ready
  const { data: batches, isLoading, refetch } = useGetWorkflowBatchesQuery(undefined, {
    pollingInterval: 0,
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
    refetchOnReconnect: false,
  })
  
  // Use mock data as fallback
  const displayBatches = batches || mockWorkflowBatches

  const handleCreateWorkflow = () => {
    setShowCreateModal(true)
  }

  const handleViewBatch = (batch: ResellerWorkflowBatch) => {
    setSelectedBatch(batch)
    setShowViewBatchModal(true)
  }

  const handleAddProducts = (batchId: string) => {
    const batch = displayBatches?.find((b) => b.id === batchId)
    if (batch) {
      setSelectedBatch(batch)
      setShowAddProductModal(true)
    }
  }

  const handleAddProductsFromView = () => {
    setShowViewBatchModal(false)
    setShowAddProductModal(true)
  }

  const handleProductAdded = () => {
    refetch()
  }

  const handleWorkflowCreated = (batchId: string) => {
    refetch()
    // Optionally open the batch details or add products modal
    const newBatch = displayBatches?.find((b) => b.id === batchId)
    if (newBatch) {
      setSelectedBatch(newBatch)
      setShowAddProductModal(true)
    }
  }

  // Empty State Component
  const EmptyState = () => (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="max-w-2xl mx-auto text-center px-6">
        {/* Box Icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-primary-100 rounded-2xl flex items-center justify-center">
            <svg
              className="w-12 h-12 text-primary-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-text-primary mb-4">
          Start your first reseller workflow
        </h1>

        {/* Description */}
        <p className="text-lg text-text-secondary mb-10 leading-relaxed">
          Easily scan products, list offers, create FBA shipments, and track profits
          <br />— all in one streamlined workflow.
        </p>

        {/* Steps */}
        <div className="space-y-6 mb-10 text-left">
          {/* Step 1 */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold">
                1
              </div>
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-text-primary leading-relaxed">
                Create new batch and add products by scanning barcodes, searching or uploading a
                buy list created in the sellerboard mobile app.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold">
                2
              </div>
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-text-primary leading-relaxed">
                Create inbound FBA shipments and print FNSKU product labels (and box/pallet labels
                if needed).
              </p>
              <p className="text-sm text-text-muted mt-1">Optional for FBM Sellers</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold">
                3
              </div>
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-text-primary leading-relaxed">
                Enter COGS for precise profit calculations in sellerboard.
              </p>
            </div>
          </div>
        </div>

        {/* Create Button */}
        <div className="flex justify-center">
          <Button
            variant="primary"
            size="lg"
            onClick={handleCreateWorkflow}
            className="px-8"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Create workflow
          </Button>
        </div>
      </div>
    </div>
  )

  // Loading State
  if (isLoading) {
    return (
      <Container size="full" className="py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-text-muted">Loading workflows...</div>
        </div>
      </Container>
    )
  }

  // Show empty state if no batches
  if (!displayBatches || displayBatches.length === 0) {
    return (
      <Container size="full" className="py-8">
        <EmptyState />
      </Container>
    )
  }

  // Workflow list view
  return (
    <>
      <Container size="full" className="py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-text-primary">Reseller Workflow</h1>
        <Button
          variant="primary"
          size="lg"
          onClick={handleCreateWorkflow}
          className="px-8"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Create workflow
        </Button>
        </div>

        {/* Summary Cards */}
        {displayBatches && displayBatches.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-surface-primary border border-border-primary rounded-lg">
              <p className="text-sm text-text-muted mb-1">Total Batches</p>
              <p className="text-2xl font-bold text-text-primary">{displayBatches.length}</p>
            </div>
            <div className="p-4 bg-surface-primary border border-border-primary rounded-lg">
              <p className="text-sm text-text-muted mb-1">Active Batches</p>
              <p className="text-2xl font-bold text-text-primary">
                {displayBatches.filter((b) => b.status === 'in_progress' || b.status === 'draft').length}
              </p>
            </div>
            <div className="p-4 bg-surface-primary border border-border-primary rounded-lg">
              <p className="text-sm text-text-muted mb-1">Total Products</p>
              <p className="text-2xl font-bold text-text-primary">
                {displayBatches.reduce((sum, b) => sum + b.totalProducts, 0)}
              </p>
            </div>
            <div className="p-4 bg-surface-primary border border-border-primary rounded-lg">
              <p className="text-sm text-text-muted mb-1">Total Units</p>
              <p className="text-2xl font-bold text-text-primary">
                {displayBatches.reduce((sum, b) => sum + b.totalUnits, 0)}
              </p>
            </div>
          </div>
        )}

        {/* Batches Table */}
        <WorkflowBatchesTable
          batches={displayBatches || []}
          onViewBatch={handleViewBatch}
          onAddProducts={handleAddProducts}
        />
      </Container>

      {/* Modals */}
      <CreateWorkflowModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleWorkflowCreated}
      />

      {selectedBatch && (
        <>
          <AddProductModal
            isOpen={showAddProductModal}
            onClose={() => setShowAddProductModal(false)}
            batchId={selectedBatch.id}
            batchName={selectedBatch.name}
            onSuccess={handleProductAdded}
          />

          <ViewBatchModal
            isOpen={showViewBatchModal}
            onClose={() => setShowViewBatchModal(false)}
            batch={selectedBatch}
            onAddProducts={handleAddProductsFromView}
          />
        </>
      )}
    </>
  )
}
