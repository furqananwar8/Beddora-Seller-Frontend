'use client'

import React, { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField } from '@/components/form-field/FormField'
import { Button } from '@/design-system/buttons'
import { Input } from '@/design-system/inputs'
import { Modal } from '@/design-system/modals'
import { type CostCenterNameValues, makeCostCenterNameSchema, MAX_COST_CENTER_NAME } from './costCenterNameSchema'

interface CostCenterNameDialogProps {
  isOpen: boolean
  title: string
  /** Where the entry goes, e.g. "L3 under Expense › Trucking Cost". */
  context?: string
  initialName?: string
  submitLabel: string
  /** Names already used by its siblings (lower-cased); a cost center's name is unique among them. */
  takenNames: ReadonlySet<string>
  onSubmit: (name: string) => void
  onClose: () => void
}

/** Name of a new or edited cost center entry. Nothing is saved until the create screen is submitted. */
export const CostCenterNameDialog: React.FC<CostCenterNameDialogProps> = ({ isOpen, title, context, initialName = '', submitLabel, takenNames, onSubmit, onClose }) => {
  const schema = useMemo(() => makeCostCenterNameSchema(takenNames, initialName), [takenNames, initialName])
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CostCenterNameValues>({ resolver: zodResolver(schema), defaultValues: { name: initialName } })

  useEffect(() => {
    if (isOpen) reset({ name: initialName })
  }, [isOpen, initialName, reset])

  if (!isOpen) return null

  const submit = handleSubmit(({ name }) => onSubmit(name))

  return (
    <Modal isOpen onClose={onClose} title={title} size="sm" closeOnEscape>
      <form onSubmit={submit} noValidate className="space-y-4">
        {context && <p className="text-sm text-text-muted">{context}</p>}
        <FormField label="Name" htmlFor="cost-center-name" required error={errors.name?.message}>
          <Input id="cost-center-name" autoFocus maxLength={MAX_COST_CENTER_NAME} {...register('name')} />
        </FormField>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </Modal>
  )
}
