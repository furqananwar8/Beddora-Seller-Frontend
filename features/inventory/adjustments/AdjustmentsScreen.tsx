'use client'

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { Spinner } from '@/design-system/loaders'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/ui.slice'
import { useDebounce } from '@/utils/debounce'
import {
  AdjustmentRow,
  BoxDimensions,
  useAdjustQuantityMutation,
  useGetAdjustmentsQuery,
  useUpdateBoxDimensionsMutation,
} from '@/services/api/inventoryAdjustments.api'
import { apiErrorMessage } from '../shipments/useShipments'
import { EditDimensionsModal } from './EditDimensionsModal'
import { EditQuantityModal } from './EditQuantityModal'
import { AdjustmentAction, RowActions } from './RowActions'

const n = (value: number) => value.toLocaleString()

const formatBox = (box: BoxDimensions | null) =>
  box
    ? `${box.length} × ${box.width} × ${box.height} ${box.dimensionUnit.toLowerCase()} · ${box.weight} ${box.weightUnit.toLowerCase()} · ${box.unitsPerBox}/box`
    : 'Not set'

type Dialog = { action: AdjustmentAction; rowId: string } | null

export const AdjustmentsScreen: React.FC = () => {
  const dispatch = useAppDispatch()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const { data: rows = [], isLoading, isError } = useGetAdjustmentsQuery(debouncedSearch || undefined)
  const [adjustQuantity, { isLoading: savingQuantity }] = useAdjustQuantityMutation()
  const [updateBox, { isLoading: savingBox }] = useUpdateBoxDimensionsMutation()

  const [dialog, setDialog] = useState<Dialog>(null)
  const [error, setError] = useState<string | null>(null)
  const target = dialog ? rows.find((r) => r.id === dialog.rowId) ?? null : null

  const open = (row: AdjustmentRow, action: AdjustmentAction) => {
    setError(null)
    setDialog({ action, rowId: row.id })
  }
  const close = () => setDialog(null)
  const notify = (message: string, type: 'success' | 'error' | 'warning') => dispatch(addNotification({ message, type }))

  const saveQuantity = async (row: AdjustmentRow, quantity: number) => {
    try {
      const result = await adjustQuantity({ id: row.id, quantity, expectedOnHand: row.onHand }).unwrap()
      const fbmChanged = result.changedBuckets.includes('FBM')
      notify(
        fbmChanged ? `${row.sku} updated. FBM changed, so push stock from the Planner to refresh channel listings.` : `${row.sku} updated`,
        fbmChanged ? 'warning' : 'success'
      )
      close()
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not update the quantity'))
    }
  }

  const saveBox = async (row: AdjustmentRow, box: BoxDimensions) => {
    try {
      await updateBox({ id: row.id, box }).unwrap()
      notify(`Box dimensions saved for ${row.sku}`, 'success')
      close()
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save the box dimensions'))
    }
  }

  return (
    <Container size="full" className="py-8">
      <div className="mb-6 px-1">
        <h1 className="text-2xl font-bold text-text-primary">Adjustments</h1>
        <p className="mt-1 text-sm text-text-muted">Correct on-hand quantities and box dimensions for each SKU.</p>
      </div>

      <input
        type="search"
        placeholder="Search SKU or product"
        aria-label="Search SKU or product"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-md rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-200"
      />

      <div className="max-h-[calc(100vh-260px)] overflow-auto rounded-lg border border-border shadow-sm">
        <Table className="min-w-full">
          <TableHeader className="sticky top-0 z-10 bg-surface shadow-sm">
            <TableRow>
              <TableHead className="min-w-[320px]">Product</TableHead>
              <TableHead>On hand</TableHead>
              <TableHead>Unallocated</TableHead>
              <TableHead>FBM</TableHead>
              <TableHead>Amazon allocated</TableHead>
              <TableHead className="min-w-[260px]">Box dimensions</TableHead>
              <TableHead className="w-16 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex justify-center py-12">
                    <Spinner />
                  </div>
                </TableCell>
              </TableRow>
            ) : isError || rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className={isError ? 'py-12 text-center font-medium text-danger-600' : 'py-12 text-center text-text-muted'}>
                    {isError ? 'Could not load inventory.' : 'No SKUs found.'}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium text-text-primary">{row.description}</div>
                    <div className="font-mono text-xs text-text-muted">{row.sku}</div>
                  </TableCell>
                  <TableCell className="font-medium">{n(row.onHand)}</TableCell>
                  <TableCell>{n(row.balances.UNALLOCATED)}</TableCell>
                  <TableCell>{n(row.balances.FBM)}</TableCell>
                  <TableCell>{n(row.balances.FBA_RESERVED)}</TableCell>
                  <TableCell className="text-sm text-text-muted">{formatBox(row.boxDimensions)}</TableCell>
                  <TableCell className="text-right">
                    <RowActions label={row.sku} onSelect={(action) => open(row, action)} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EditQuantityModal
        row={dialog?.action === 'quantity' ? target : null}
        saving={savingQuantity}
        error={error}
        onSave={saveQuantity}
        onClose={close}
      />
      <EditDimensionsModal
        row={dialog?.action === 'dimensions' ? target : null}
        saving={savingBox}
        error={error}
        onSave={saveBox}
        onClose={close}
      />
    </Container>
  )
}
