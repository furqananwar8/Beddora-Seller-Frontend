'use client'

import React from 'react'
import { useFinalizeImportMutation } from '@/services/api/import.api'
import { Button } from '@/design-system/buttons'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setFinalizing, setFinalizeError, resetImport } from '@/store/manualImport.slice'
import type { ImportType } from '@/store/manualImport.slice'

/**
 * FinalizeButton Component
 * 
 * Button to finalize approved imports and commit to production
 * Features:
 * - Finalize approved rows
 * - Show progress and results
 * - Handle errors gracefully
 */

interface FinalizeButtonProps {
  importType: ImportType
  amazonAccountId: string
  onSuccess?: () => void
}

export const FinalizeButton: React.FC<FinalizeButtonProps> = ({
  importType,
  amazonAccountId,
  onSuccess,
}) => {
  const dispatch = useAppDispatch()
  const stats = useAppSelector((state) => state.manualImport.stats)
  const isFinalizing = useAppSelector((state) => state.manualImport.isFinalizing)
  const [finalizeImport, { isLoading }] = useFinalizeImportMutation()

  const handleFinalize = async () => {
    if (stats.approved === 0) {
      alert('No approved rows to finalize. Please approve some rows first.')
      return
    }

    if (
      !confirm(
        `Are you sure you want to finalize ${stats.approved} approved rows? This will commit them to production.`
      )
    ) {
      return
    }

    try {
      dispatch(setFinalizing(true))
      dispatch(setFinalizeError(null))

      const result = await finalizeImport({
        type: importType,
        data: {
          amazonAccountId,
        },
      }).unwrap()

      if (result.data.errors && result.data.errors.length > 0) {
        alert(
          `Import finalized with some errors:\n${result.data.errors.slice(0, 5).join('\n')}${
            result.data.errors.length > 5 ? `\n...and ${result.data.errors.length - 5} more` : ''
          }`
        )
      } else {
        alert(`Successfully imported ${result.data.recordsImported} records!`)
      }

      // Reset import state
      dispatch(resetImport())
      onSuccess?.()
    } catch (error: any) {
      const errorMessage = error?.data?.error || error?.message || 'Finalization failed'
      dispatch(setFinalizeError(errorMessage))
      alert(`Failed to finalize import: ${errorMessage}`)
    } finally {
      dispatch(setFinalizing(false))
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="text-sm text-gray-600">
        <strong>{stats.approved}</strong> approved row{stats.approved !== 1 ? 's' : ''} ready to
        import
      </div>
      <Button
        variant="primary"
        onClick={handleFinalize}
        disabled={isFinalizing || isLoading || stats.approved === 0}
        isLoading={isFinalizing || isLoading}
      >
        Finalize Import
      </Button>
    </div>
  )
}

