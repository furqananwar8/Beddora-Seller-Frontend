"use client"

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import {
  InventoryItemChange,
  InventoryItemStatus,
  InventorySkuConflict,
  ProductInventoryItem,
  useUpdateInventoryItemsMutation,
} from '@/services/api/inventoryPlanner.api'

export interface RowDraft {
  sku: string
  description: string
  status: InventoryItemStatus
}

export interface RowErrors {
  sku?: string
  description?: string
}

export interface BulkEditState {
  isEditing: boolean
  drafts: Record<string, RowDraft>
  errors: Record<string, RowErrors>
}

const INITIAL_EDIT: BulkEditState = { isEditing: false, drafts: {}, errors: {} }

const CONFLICT_MESSAGE: Record<InventorySkuConflict['reason'], string> = {
  duplicate_in_request: 'Used by another row in this edit',
  used_by_other_item: 'Already used by another item',
}

/** Validates drafts and returns only the fields that actually changed. */
function collectChanges(
  drafts: Record<string, RowDraft>,
  products: ProductInventoryItem[]
): { changes: InventoryItemChange[]; errors: Record<string, RowErrors> } {
  const byId = new Map(products.map((p) => [p.id, p]))
  const errors: Record<string, RowErrors> = {}
  const changes: InventoryItemChange[] = []

  // Final SKU of every row, so clashes with rows outside the edit are caught too
  const finalSku = new Map(products.map((p) => [p.id, p.sku]))
  for (const [id, draft] of Object.entries(drafts)) finalSku.set(id, draft.sku.trim())
  const owners = new Map<string, number>()
  for (const sku of finalSku.values()) owners.set(sku, (owners.get(sku) ?? 0) + 1)

  for (const [id, draft] of Object.entries(drafts)) {
    const original = byId.get(id)
    if (!original) continue
    const sku = draft.sku.trim()
    const description = draft.description.trim()

    const rowErrors: RowErrors = {}
    if (!sku) rowErrors.sku = 'SKU is required'
    else if ((owners.get(sku) ?? 0) > 1) rowErrors.sku = 'Another row already uses this SKU'
    if (!description) rowErrors.description = 'Description is required'
    if (rowErrors.sku || rowErrors.description) {
      errors[id] = rowErrors
      continue
    }

    const change: InventoryItemChange = { id }
    if (sku !== original.sku) change.sku = sku
    if (description !== original.description) change.description = description
    if (draft.status !== original.status) change.status = draft.status
    if (Object.keys(change).length > 1) changes.push(change)
  }

  return { changes, errors }
}

/**
 * Inline bulk editing of planner rows: start on the selected rows, edit
 * SKU / description / status per row, then save every change at once.
 */
export function useInventoryBulkEdit(products: ProductInventoryItem[]) {
  const [edit, setEdit] = useState<BulkEditState>(INITIAL_EDIT)
  const [updateItems, { isLoading: isSaving }] = useUpdateInventoryItemsMutation()

  const startEditing = useCallback((rows: ProductInventoryItem[]) => {
    if (rows.length === 0) return
    setEdit({
      isEditing: true,
      errors: {},
      drafts: Object.fromEntries(
        rows.map((p) => [p.id, { sku: p.sku, description: p.description, status: p.status }])
      ),
    })
  }, [])

  const cancel = useCallback(() => setEdit(INITIAL_EDIT), [])

  const setDraftField = useCallback((id: string, field: keyof RowDraft, value: string) => {
    setEdit((prev) => ({
      ...prev,
      drafts: { ...prev.drafts, [id]: { ...prev.drafts[id], [field]: value } },
      errors: { ...prev.errors, [id]: { ...prev.errors[id], [field]: undefined } },
    }))
  }, [])

  const save = useCallback(async () => {
    const { changes, errors } = collectChanges(edit.drafts, products)
    if (Object.keys(errors).length > 0) {
      setEdit((prev) => ({ ...prev, errors }))
      toast.error('Fix the highlighted fields before saving')
      return
    }
    if (changes.length === 0) {
      setEdit(INITIAL_EDIT)
      toast.info('No changes to save')
      return
    }

    try {
      await updateItems(changes).unwrap()
      toast.success(`Saved ${changes.length} item${changes.length === 1 ? '' : 's'}`)
      setEdit(INITIAL_EDIT)
    } catch (err: any) {
      const conflicts: InventorySkuConflict[] = err?.data?.conflicts ?? []
      if (conflicts.length > 0) {
        setEdit((prev) => ({
          ...prev,
          errors: Object.fromEntries(conflicts.map((c) => [String(c.id), { sku: CONFLICT_MESSAGE[c.reason] }])),
        }))
      }
      toast.error(err?.data?.error ?? 'Couldn’t save changes. Try again.')
    }
  }, [edit.drafts, products, updateItems])

  return { edit, isSaving, startEditing, cancel, setDraftField, save }
}

export type InventoryBulkEdit = ReturnType<typeof useInventoryBulkEdit>
