'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { Spinner } from '@/design-system/loaders'
import { CostCenterMultiSelect } from '@/features/finance/shared/CostCenterSelect'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import type { CostCenterOption } from '@/services/api/finance.api'
import type { ExpenseMapping, ExpenseMappingEntry } from '@/services/api/procurement.api'

/** Where "+ Create new" in the picker leads: the cost center screen. */
const COST_CENTERS_HREF = '/dashboard/finance/cost-center'

interface ExpenseMappingModalProps<K extends string> {
  open: boolean
  onClose: () => void
  /** What a mapped column takes, shown above the columns. */
  description: string
  mapping: ExpenseMapping<K> | undefined
  isLoading: boolean
  saving: boolean
  onSave: (entries: ExpenseMappingEntry<K>[]) => Promise<unknown>
}

/** "Map expense columns": for each of a screen's columns, the L4 cost centers whose payments it takes (each L4 in one column only). */
export function ExpenseMappingModal<K extends string>({ open, onClose, description, mapping, isLoading, saving, onSave }: ExpenseMappingModalProps<K>) {
  const { success, failure } = useApiFeedback()
  const [draft, setDraft] = useState<Partial<Record<K, CostCenterOption[]>>>({})

  useEffect(() => {
    if (open && mapping) setDraft(Object.fromEntries(mapping.columns.map((column) => [column.key, column.costCenters])) as Partial<Record<K, CostCenterOption[]>>)
  }, [open, mapping])

  const entries = Object.entries(draft) as Array<[K, CostCenterOption[] | undefined]>
  const pickedBy = new Map(entries.flatMap(([key, choices]) => (choices ?? []).map((choice) => [choice.id, key] as const)))
  const labelOf = new Map(mapping?.columns.map((column) => [column.key, column.label]) ?? [])

  const submit = async () => {
    try {
      await onSave(entries.map(([bucket, choices]) => ({ bucket, costCenterIds: (choices ?? []).map((choice) => choice.id) })))
      success('Expense columns mapped')
      onClose()
    } catch (error) {
      failure(error, 'Could not save the mapping')
    }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Map expense columns" size="lg" closeOnEscape={!saving} className="sm:overflow-visible">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-muted">{description}</p>
        {isLoading || !mapping ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {mapping.columns.map((column) => (
              <div key={column.key} className="grid items-center gap-2 px-4 py-3 sm:grid-cols-[180px_1fr]">
                <p className="text-sm font-semibold text-text-primary">{column.label}</p>
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <CostCenterMultiSelect
                      id={`map-${column.key}`}
                      value={(draft[column.key] ?? []).map((choice) => choice.id)}
                      onChange={(choices) => setDraft((current) => ({ ...current, [column.key]: choices }))}
                      options={mapping.options}
                      addHref={COST_CENTERS_HREF}
                      disabledReason={(choice) => {
                        const owner = pickedBy.get(choice.id)
                        return owner && owner !== column.key ? `Mapped to ${labelOf.get(owner)}` : false
                      }}
                      placeholder="Pick L4 expenses"
                    />
                  </div>
                  {(draft[column.key] ?? []).length > 0 && (
                    <Button type="button" variant="outline" size="field" onClick={() => setDraft((current) => ({ ...current, [column.key]: [] }))} disabled={saving}>
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void submit()} isLoading={saving} disabled={!mapping}>
            Save mapping
          </Button>
        </div>
      </div>
    </Modal>
  )
}
