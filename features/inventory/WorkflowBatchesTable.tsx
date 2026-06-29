"use client"

import React, { useMemo, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/design-system/tables'
import { Button } from '@/design-system/buttons'
import { Badge } from '@/design-system/badges'
import { ResellerWorkflowBatch, WorkflowStatus } from '@/services/api/resellerWorkflow.api'
import { formatCurrency, formatNumber } from '@/utils/format'

interface WorkflowBatchesTableProps {
  batches: ResellerWorkflowBatch[]
  onViewBatch: (batch: ResellerWorkflowBatch) => void
  onAddProducts: (batchId: string) => void
  onDeleteBatch?: (batchId: string) => void
}

/**
 * Workflow Batches Table Component
 * 
 * Displays workflow batches with actions
 */
export const WorkflowBatchesTable = ({
  batches,
  onViewBatch,
  onAddProducts,
  onDeleteBatch,
}: WorkflowBatchesTableProps) => {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const paginatedBatches = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage
    return batches.slice(startIdx, startIdx + itemsPerPage)
  }, [batches, currentPage])

  const totalPages = Math.ceil(batches.length / itemsPerPage)

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
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  if (batches.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-border-primary bg-surface-primary">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch Number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Fulfillment</TableHead>
                <TableHead className="text-right">Products</TableHead>
                <TableHead className="text-right">Total Units</TableHead>
                <TableHead className="text-right">Total COGS</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-48">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBatches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">{batch.batchNumber}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => onViewBatch(batch)}
                      className="text-primary-600 hover:text-primary-700 hover:underline font-medium"
                    >
                      {batch.name}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge variant={batch.fulfillmentType === 'FBA' ? 'primary' : 'secondary'}>
                      {batch.fulfillmentType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(batch.totalProducts)}</TableCell>
                  <TableCell className="text-right">{formatNumber(batch.totalUnits)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(batch.totalCOGS)}
                  </TableCell>
                  <TableCell>{getStatusBadge(batch.status)}</TableCell>
                  <TableCell className="text-sm text-text-muted">
                    {formatDate(batch.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAddProducts(batch.id)}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Products
                      </Button>
                      <button
                        onClick={() => onViewBatch(batch)}
                        className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded transition-colors"
                        title="View details"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-muted">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, batches.length)} of {batches.length} batches
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-primary-600 text-white'
                        : 'text-text-muted hover:bg-surface-secondary hover:text-text-primary'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
