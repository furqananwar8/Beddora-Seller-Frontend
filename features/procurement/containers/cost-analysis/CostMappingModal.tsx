'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { Spinner } from '@/design-system/loaders'
import { CostCenterSelect } from '@/features/finance/shared/CostCenterSelect'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import type { CostCenterOption } from '@/services/api/finance.api'
import { useGetContainerCostMappingQuery, useSaveContainerCostMappingMutation, type CostBucketKey } from '@/services/api/procurement.api'

type Draft = Partial<Record<CostBucketKey, CostCenterOption | null>>

/** Where "+ Create new" in the picker leads: the cost center screen. */
const COST_CENTERS_HREF = '/dashboard/finance/cost-center'

/** "Map expenses": for each cost analysis column, the one L4 cost center whose payments it takes. */
export const CostMappingModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { data, isLoading } = useGetContainerCostMappingQuery(undefined, { skip: !open })
  const [save, { isLoading: saving }] = useSaveContainerCostMappingMutation()
  const { success, failure } = useApiFeedback()
  const [draft, setDraft] = useState<Draft>({})

  useEffect(() => {
    if (open && data) setDraft(Object.fromEntries(data.columns.map((column) => [column.key, column.costCenter])))
  }, [open, data])

  const pickedBy = new Map(Object.entries(draft).flatMap(([key, choice]) => (choice ? [[choice.id, key] as const] : [])))
  const labelOf = new Map(data?.columns.map((column) => [column.key, column.label]) ?? [])

  const submit = async () => {
    try {
      await save(Object.entries(draft).map(([bucket, choice]) => ({ bucket: bucket as CostBucketKey, costCenterId: choice?.id ?? null }))).unwrap()
      success('Expense columns mapped')
      onClose()
    } catch (error) {
      failure(error, 'Could not save the mapping')
    }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Map expense columns" size="lg" closeOnEscape={!saving} className="sm:overflow-visible">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-muted">Each column takes the approved payment requests of its container booked to the L4 cost center picked here. Renaming a cost center keeps the mapping.</p>
        {isLoading || !data ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {data.columns.map((column) => (
              <div key={column.key} className="grid items-center gap-2 px-4 py-3 sm:grid-cols-[180px_1fr]">
                <p className="text-sm font-semibold text-text-primary">{column.label}</p>
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <CostCenterSelect
                      id={`map-${column.key}`}
                      value={draft[column.key]?.id ?? null}
                      onChange={(choice) => setDraft((current) => ({ ...current, [column.key]: choice }))}
                      options={data.options}
                      addHref={COST_CENTERS_HREF}
                      disabledReason={(choice) => {
                        const owner = pickedBy.get(choice.id)
                        return owner && owner !== column.key ? `Mapped to ${labelOf.get(owner as CostBucketKey)}` : false
                      }}
                      placeholder="Pick an L4 expense"
                    />
                  </div>
                  {draft[column.key] && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setDraft((current) => ({ ...current, [column.key]: null }))} disabled={saving}>
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
          <Button type="button" onClick={() => void submit()} isLoading={saving} disabled={!data}>
            Save mapping
          </Button>
        </div>
      </div>
    </Modal>
  )
}
