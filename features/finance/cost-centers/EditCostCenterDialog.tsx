'use client'

import React, { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormField } from '@/components/form-field/FormField'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { Button } from '@/design-system/buttons'
import { Input } from '@/design-system/inputs'
import { Modal } from '@/design-system/modals'
import { useGetCostCenterMoveTargetsQuery, type CostCenterMoveTarget } from '@/services/api/costCenters.api'
import { levelLabel } from './costCenterCode'
import { makeCostCenterNameSchema, MAX_COST_CENTER_NAME } from './create/costCenterNameSchema'

export interface EditCostCenterValues {
  name: string
  /** The head it is moved under; null leaves it where it is. */
  parentId: number | null
}

interface EditCostCenterDialogProps {
  isOpen: boolean
  node: { id: number; name: string; level: number }
  /** Names already used by its siblings (lower-cased). */
  takenNames: ReadonlySet<string>
  onSubmit: (values: EditCostCenterValues) => void
  onClose: () => void
}

/**
 * Edit a cost center: its name, and (below L1) which head it sits under. The heads offered are those that leave room
 * for it and what is under it; moving to a head of another level shifts its level (an L3 under an L1 becomes an L2).
 */
export const EditCostCenterDialog: React.FC<EditCostCenterDialogProps> = ({ isOpen, node, takenNames, onSubmit, onClose }) => {
  const movable = node.level > 1
  const { data, isFetching } = useGetCostCenterMoveTargetsQuery(node.id, { skip: !isOpen || !movable })
  const schema = useMemo(() => makeCostCenterNameSchema(takenNames, node.name).and(z.object({ parentId: z.number().nullable() })), [takenNames, node.name])
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EditCostCenterValues>({ resolver: zodResolver(schema), defaultValues: { name: node.name, parentId: null } })

  useEffect(() => {
    if (isOpen) reset({ name: node.name, parentId: null })
  }, [isOpen, node.name, reset])

  if (!isOpen) return null

  const targets = data?.targets ?? []
  const picked = targets.find((target) => target.id === watch('parentId')) ?? null

  return (
    <Modal isOpen onClose={onClose} title={`Edit ${levelLabel(node.level)} cost center`} size="md" closeOnEscape className="sm:overflow-visible">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField label="Name" htmlFor="cost-center-name" required error={errors.name?.message}>
          <Input id="cost-center-name" autoFocus maxLength={MAX_COST_CENTER_NAME} {...register('name')} />
        </FormField>
        {movable && (
          <FormField
            label="Move under"
            htmlFor="cost-center-parent"
            hint={data?.levelLocked ?? (picked ? `It becomes ${levelLabel(picked.resultingLevel)}${picked.resultingLevel === node.level ? '' : ', and what is under it moves with it'}.` : 'Leave empty to keep it where it is. What is under it moves with it.')}
          >
            <Controller
              control={control}
              name="parentId"
              render={({ field }) => (
                <SearchableSelect<CostCenterMoveTarget>
                  id="cost-center-parent"
                  value={picked}
                  onChange={(target) => field.onChange(target.id)}
                  options={targets}
                  getKey={(target) => target.id}
                  getLabel={(target) => target.path}
                  renderOption={(target) => (
                    <span className="flex items-center justify-between gap-3">
                      <span className="break-words font-medium">{target.path}</span>
                      <span className="shrink-0 text-xs text-text-muted">
                        {levelLabel(target.level)} head{target.resultingLevel === node.level ? '' : ` · becomes ${levelLabel(target.resultingLevel)}`}
                      </span>
                    </span>
                  )}
                  loading={isFetching}
                  placeholder="Keep where it is"
                  searchPlaceholder="Search heads..."
                  emptyText="No other head fits here."
                  wrapValue
                />
              )}
            />
          </FormField>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  )
}
