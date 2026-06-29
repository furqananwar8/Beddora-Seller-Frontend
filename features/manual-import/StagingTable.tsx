'use client'

import React, { useState, useEffect } from 'react'
import { useGetStagingRowsQuery } from '@/services/api/import.api'
import { Card } from '@/design-system/cards'
import { Spinner } from '@/design-system/loaders'
import { Badge } from '@/design-system/badges'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setStagingRows,
  toggleRowSelection,
  selectAllRows,
  deselectAllRows,
} from '@/store/manualImport.slice'
import type { ImportType, StagingRow, StagingStatus } from '@/store/manualImport.slice'

/**
 * StagingTable Component
 * 
 * Displays imported rows with validation errors
 * Features:
 * - Show all staging rows
 * - Display validation errors
 * - Allow inline editing
 * - Row selection for bulk operations
 */

interface StagingTableProps {
  importType: ImportType
  amazonAccountId: string
  status?: StagingStatus
}

export const StagingTable: React.FC<StagingTableProps> = ({
  importType,
  amazonAccountId,
  status,
}) => {
  const dispatch = useAppDispatch()
  const selectedRowIds = useAppSelector((state) => state.manualImport.selectedRowIds)
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editedData, setEditedData] = useState<Record<string, any>>({})

  const { data: rows, isLoading, refetch } = useGetStagingRowsQuery({
    type: importType,
    amazonAccountId,
    status,
  })

  useEffect(() => {
    if (rows) {
      dispatch(setStagingRows(rows))
    }
  }, [rows, dispatch])

  const handleToggleSelect = (rowId: string) => {
    dispatch(toggleRowSelection(rowId))
  }

  const handleSelectAll = () => {
    if (rows && selectedRowIds.length === rows.length) {
      dispatch(deselectAllRows())
    } else {
      dispatch(selectAllRows())
    }
  }

  const handleEdit = (row: StagingRow) => {
    setEditingRowId(row.id)
    setEditedData({ ...row.rawData })
  }

  const handleSaveEdit = async (rowId: string) => {
    // TODO: Implement API call to update row
    setEditingRowId(null)
    setEditedData({})
    refetch()
  }

  const handleCancelEdit = () => {
    setEditingRowId(null)
    setEditedData({})
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <Spinner />
      </Card>
    )
  }

  if (!rows || rows.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-gray-500">
          No staging rows found.
        </div>
      </Card>
    )
  }

  const allSelected = rows.length > 0 && selectedRowIds.length === rows.length

  return (
    <Card className="p-6">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Staging Rows ({rows.length})</h3>
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Data
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Errors
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((row) => {
              const isSelected = selectedRowIds.includes(row.id)
              const isEditing = editingRowId === row.id

              return (
                <tr
                  key={row.id}
                  className={isSelected ? 'bg-blue-50' : isEditing ? 'bg-yellow-50' : ''}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(row.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <Badge
                        variant={row.validated ? 'success' : 'error'}
                        className="text-xs"
                      >
                        {row.validated ? 'Valid' : 'Invalid'}
                      </Badge>
                      <Badge variant="primary" className="text-xs">
                        {row.status}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {isEditing ? (
                      <div className="space-y-2">
                        {Object.entries(editedData).map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <span className="text-xs font-medium w-24">{key}:</span>
                            <input
                              type="text"
                              value={value || ''}
                              onChange={(e) =>
                                setEditedData({ ...editedData, [key]: e.target.value })
                              }
                              className="text-xs border rounded px-2 py-1 flex-1"
                            />
                          </div>
                        ))}
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleSaveEdit(row.id)}
                            className="text-xs bg-green-500 text-white px-2 py-1 rounded"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-xs bg-gray-500 text-white px-2 py-1 rounded"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm">
                        <pre className="whitespace-pre-wrap text-xs">
                          {JSON.stringify(row.rawData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {row.errorMessages && row.errorMessages.length > 0 ? (
                      <div className="text-xs text-red-600">
                        {row.errorMessages.map((err, idx) => (
                          <div key={idx} className="mb-1">
                            <strong>{err.field}:</strong> {err.message}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-green-600">No errors</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {!isEditing && (
                      <button
                        onClick={() => handleEdit(row)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

