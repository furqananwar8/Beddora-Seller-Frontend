'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormActions } from '@/components/form-actions/FormActions'
import { FormField, fieldClass } from '@/components/form-field/FormField'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import type { ProductManager } from '@/services/api/productManagers.api'
import { emptyProductManagerValues, productManagerFormValues, productManagerSchema, type ProductManagerFormValues } from './productManagerSchema'
import { useSaveProductManager } from './useSaveProductManager'

interface ProductManagerDialogProps {
  isOpen: boolean
  /** The manager to edit; omit to add a new one. */
  manager?: ProductManager | null
  onClose: () => void
  /** Called with the saved manager; the dialog closes itself. */
  onSaved?: (manager: ProductManager) => void
}

/** Adds or edits a product manager. Their products are assigned afterwards, from the manager's row actions. */
export const ProductManagerDialog: React.FC<ProductManagerDialogProps> = (props) => (
  <Modal isOpen={props.isOpen} onClose={props.onClose} title={props.manager ? 'Edit manager' : 'Add manager'} size="md">
    {props.isOpen && <DialogForm key={props.manager?.id ?? 'new'} {...props} />}
  </Modal>
)

const DialogForm: React.FC<ProductManagerDialogProps> = ({ manager, onClose, onSaved }) => {
  const save = useSaveProductManager(manager ?? undefined)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductManagerFormValues>({
    resolver: zodResolver(productManagerSchema),
    defaultValues: manager ? productManagerFormValues(manager) : emptyProductManagerValues,
  })

  const submit = handleSubmit(async (values) => {
    const saved = await save(values)
    if (!saved) return
    onSaved?.(saved)
    onClose()
  })

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Name" htmlFor="pm-name" required error={errors.name?.message}>
          <input id="pm-name" autoComplete="off" placeholder="e.g. Bushra" className={fieldClass(errors.name?.message)} {...register('name')} />
        </FormField>
        <FormField label="Email" htmlFor="pm-email" required error={errors.email?.message}>
          <input id="pm-email" type="email" autoComplete="off" placeholder="name@beddora.ca" className={fieldClass(errors.email?.message)} {...register('email')} />
        </FormField>
      </div>

      <FormActions>
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          {manager ? 'Save' : 'Add manager'}
        </Button>
      </FormActions>
    </form>
  )
}
