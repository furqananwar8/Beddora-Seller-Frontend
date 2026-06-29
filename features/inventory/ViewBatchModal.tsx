"use client"

import React from 'react'
import { Modal } from '@/design-system/modals'
import { Badge } from '@/design-system/badges'
import { Button } from '@/design-system/buttons'
import { ResellerWorkflowBatch, WorkflowStatus } from '@/services/api/resellerWorkflow.api'
import { formatCurrency, formatNumber } from '@/utils/format'

interface ViewBatchModalProps {
  isOpen: boolean
  onClose: () => void
  batch: ResellerWorkflowBatch | null
  onAddProducts?: () => void
}

/**
 * View Batch Modal Component
 * 
 * Modal for viewing batch details and products
 */
export const ViewBatchModal = ({ isOpen, onClose, batch, onAddProducts }: ViewBatchModalProps) => {
  if (!batch) return null

  const getStatusBadge = (status: WorkflowStatus) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>
      case 'in_progress':
        return <Badge variant="primary">In Progress</Badge>
      case 'shipped':
        return <Badge variant="warning">Shipped</Badge>
      case 'completed':
        return <Badge variant="success">Completed</Badge>
      case 'cancelled':
        return <Badge variant="error">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={batch.name} size="lg">
      <div className="space-y-6">
        {/* Batch Info */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-surface-secondary rounded-lg">
          <div>
            <p className="text-sm text-text-muted mb-1">Batch Number</p>
            <p className="font-semibold text-text-primary">{batch.batchNumber}</p>
          </div>
          <div>
            <p className="text-sm text-text-muted mb-1">Status</p>
            <div>{getStatusBadge(batch.status)}</div>
          </div>
          <div>
            <p className="text-sm text-text-muted mb-1">Fulfillment Type</p>
            <Badge variant={batch.fulfillmentType === 'FBA' ? 'primary' : 'secondary'}>
              {batch.fulfillmentType}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-text-muted mb-1">Created</p>
            <p className="text-sm text-text-primary">{formatDate(batch.createdAt)}</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-surface-secondary rounded-lg">
            <p className="text-sm text-text-muted mb-1">Total Products</p>
            <p className="text-2xl font-bold text-text-primary">{formatNumber(batch.totalProducts)}</p>
          </div>
          <div className="p-4 bg-surface-secondary rounded-lg">
            <p className="text-sm text-text-muted mb-1">Total Units</p>
            <p className="text-2xl font-bold text-text-primary">{formatNumber(batch.totalUnits)}</p>
          </div>
          <div className="p-4 bg-surface-secondary rounded-lg">
            <p className="text-sm text-text-muted mb-1">Total COGS</p>
            <p className="text-2xl font-bold text-text-primary">{formatCurrency(batch.totalCOGS)}</p>
          </div>
        </div>

        {/* Notes */}
        {batch.notes && (
          <div>
            <p className="text-sm font-medium text-text-primary mb-2">Notes</p>
            <p className="text-sm text-text-secondary p-3 bg-surface-secondary rounded-lg">
              {batch.notes}
            </p>
          </div>
        )}

        {/* Products List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-text-primary">Products</p>
            {onAddProducts && (
              <Button variant="outline" size="sm" onClick={onAddProducts}>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Products
              </Button>
            )}
          </div>
          {batch.products && batch.products.length > 0 ? (
            <div className="border border-border-primary rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-secondary sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium text-text-primary">Product</th>
                      <th className="text-left p-3 font-medium text-text-primary">Condition</th>
                      <th className="text-right p-3 font-medium text-text-primary">Qty</th>
                      <th className="text-right p-3 font-medium text-text-primary">COGS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-primary">
                    {batch.products.map((product) => (
                      <tr key={product.id} className="hover:bg-surface-secondary">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.title}
                                className="w-10 h-10 object-cover rounded"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-surface-secondary rounded flex items-center justify-center">
                                <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-text-primary truncate">{product.title || product.sku}</p>
                              <p className="text-xs text-text-muted">{product.asin || product.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary">{product.condition.replace('_', ' ')}</Badge>
                        </td>
                        <td className="p-3 text-right">{product.quantity}</td>
                        <td className="p-3 text-right font-semibold">{formatCurrency(product.costOfGoods)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-surface-secondary rounded-lg">
              <p className="text-text-muted">No products added yet</p>
              {onAddProducts && (
                <Button variant="primary" size="sm" onClick={onAddProducts} className="mt-4">
                  Add Your First Product
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-primary">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
