'use client'

import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormField, fieldClass } from '@/components/form-field/FormField'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useCreatePoProductMutation, type CategoryRef, type PoProduct } from '@/services/api/procurement.api'
import { applyServerIssues } from '@/utils/apiErrors'
import { CategorySelect } from '../shared/CategorySelect'
import { emptyProductValues, nameField, skuField, toProductBody } from './productForm'
import { SkuInput } from './SkuInput'

const quickSchema = z.object({
  name: nameField,
  sku: skuField,
  category: z.custom<CategoryRef | null>(),
})

type QuickValues = z.infer<typeof quickSchema>

interface QuickProductModalProps {
  isOpen: boolean
  onClose: () => void
  /** The new product, ready to put on the order. */
  onCreated: (product: PoProduct) => void
}

/** "+ Add new product" from a product picker: a master with just name, SKU and category. Details can follow on the product page. */
export const QuickProductModal: React.FC<QuickProductModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { success, failure } = useApiFeedback()
  const [createProduct, { isLoading }] = useCreatePoProductMutation()
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<QuickValues>({ resolver: zodResolver(quickSchema), defaultValues: { name: '', sku: '', category: null } })

  const close = () => {
    reset()
    onClose()
  }

  const submit = handleSubmit(async (values) => {
    try {
      const created = await createProduct(toProductBody({ ...emptyProductValues, name: values.name, sku: values.sku, category: values.category })).unwrap()
      success(`${created.sku} created`)
      onCreated(created)
      close()
    } catch (error) {
      if (!applyServerIssues(error, setError, ['name', 'sku'])) failure(error, 'Could not create the product')
    }
  })

  return (
    <Modal isOpen={isOpen} onClose={close} title="Add new product" size="sm" closeOnEscape={!isLoading}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <FormField label="Name" htmlFor="quick-name" required error={errors.name?.message}>
          <input id="quick-name" autoFocus autoComplete="off" className={fieldClass(errors.name?.message)} {...register('name')} />
        </FormField>
        <FormField label="SKU" htmlFor="quick-sku" required error={errors.sku?.message}>
          <SkuInput id="quick-sku" error={errors.sku?.message} onTaken={(sku) => setError('sku', { message: `SKU ${sku} is already used by another product` })} {...register('sku')} />
        </FormField>
        <FormField label="Category" htmlFor="quick-category">
          <Controller control={control} name="category" render={({ field }) => <CategorySelect id="quick-category" value={field.value} onChange={field.onChange} canAdd />} />
        </FormField>
        <p className="text-xs text-text-muted">Weight, dimensions and variations can be added from the product page later.</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={close} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Create product
          </Button>
        </div>
      </form>
    </Modal>
  )
}
