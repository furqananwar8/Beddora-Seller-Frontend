'use client'

import React from 'react'
import { useApproveRowsMutation, useRejectRowsMutation } from '@/services/api/import.api'
import { Button } from '@/design-system/buttons'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  updateStagingRow,
  deselectAllRows,
} from '@/store/manualImport.slice'
import type { ImportType, StagingStatus } from '@/store/manualImport.slice'

/**
 * ApproveRejectToolbar Component
 * 
 * Toolbar for approving/rejecting selected staging rows
 * Features:
 * - Approve selected rows
 * - Reject selected rows
 * - Show selection count
 */

interface ApproveRejectToolbarProps {
  importType: ImportType
  amazonAccountId: string
  onUpdate?: () => void
}

export const ApproveRejectToolbar: React.FC<ApproveRejectToolbarProps> = ({
  importType,
  amazonAccountId,
  onUpdate,
}) => {
  const dispatch = useAppDispatch()
  const selectedRowIds = useAppSelector((state) => state.manualImport.selectedRowIds)
  const [approveRows, { isLoading: isApproving }] = useApproveRowsMutation()
  const [rejectRows, { isLoading: isRejecting }] = useRejectRowsMutation()

  const handleApprove = async () => {
    if (selectedRowIds.length === 0) {
      alert('Please select rows to approve')
      return
    }

    try {
      const result = await approveRows({
        type: importType,
        data: {
          amazonAccountId,
          rowIds: selectedRowIds,
        },
      }).unwrap()

      // Update local state
      selectedRowIds.forEach((rowId) => {
        dispatch(
          updateStagingRow({
            id: rowId,
            userId: '',
            amazonAccountId,
            marketplaceId: '',
            rawData: {},
            validated: true,
            errorMessages: null,
            status: 'approved',
            createdAt: '',
            updatedAt: new Date().toISOString(),
          } as any)
        )
      })

      dispatch(deselectAllRows())
      alert(`Successfully approved ${result.data.count} rows`)
      onUpdate?.()
    } catch (error: any) {
      alert(`Failed to approve rows: ${error?.data?.error || error?.message}`)
    }
  }

  const handleReject = async () => {
    if (selectedRowIds.length === 0) {
      alert('Please select rows to reject')
      return
    }

    if (!confirm(`Are you sure you want to reject ${selectedRowIds.length} rows?`)) {
      return
    }

    try {
      const result = await rejectRows({
        type: importType,
        data: {
          amazonAccountId,
          rowIds: selectedRowIds,
        },
      }).unwrap()

      // Update local state
      selectedRowIds.forEach((rowId) => {
        dispatch(
          updateStagingRow({
            id: rowId,
            userId: '',
            amazonAccountId,
            marketplaceId: '',
            rawData: {},
            validated: false,
            errorMessages: null,
            status: 'rejected',
            createdAt: '',
            updatedAt: new Date().toISOString(),
          } as any)
        )
      })

      dispatch(deselectAllRows())
      alert(`Successfully rejected ${result.data.count} rows`)
      onUpdate?.()
    } catch (error: any) {
      alert(`Failed to reject rows: ${error?.data?.error || error?.message}`)
    }
  }

  if (selectedRowIds.length === 0) {
    return null
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 border rounded-lg">
      <div className="text-sm text-gray-700">
        <strong>{selectedRowIds.length}</strong> row{selectedRowIds.length !== 1 ? 's' : ''}{' '}
        selected
      </div>
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={handleApprove}
          disabled={isApproving || isRejecting}
          isLoading={isApproving}
        >
          Approve Selected
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={handleReject}
          disabled={isApproving || isRejecting}
          isLoading={isRejecting}
        >
          Reject Selected
        </Button>
      </div>
    </div>
  )
}

