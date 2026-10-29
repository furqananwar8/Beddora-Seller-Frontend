'use client'

import React, { useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormActions } from '@/components/form-actions/FormActions'
import { FormField, fieldClass } from '@/components/form-field/FormField'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import type { ProductManager } from '@/services/api/productManagers.api'
import { useAmazonSkuOptions, type SkuOption } from '../useManagerProducts'
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

/** Adds or edits a product manager and the Amazon SKUs they look after. */
export const ProductManagerDialog: React.FC<ProductManagerDialogProps> = (props) => (
  <Modal isOpen={props.isOpen} onClose={props.onClose} title={props.manager ? 'Edit manager' : 'Add manager'} size="md">
    {props.isOpen && <DialogForm key={props.manager?.id ?? 'new'} {...props} />}
  </Modal>
)

const DialogForm: React.FC<ProductManagerDialogProps> = ({ manager, onClose, onSaved }) => {
  const save = useSaveProductManager(manager ?? undefined)
  const { options: skuOptions, isFetching } = useAmazonSkuOptions()
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductManagerFormValues>({
    resolver: zodResolver(productManagerSchema),
    defaultValues: manager ? productManagerFormValues(manager) : emptyProductManagerValues,
  })

  // SKUs already assigned stay pickable even when they have not sold in the last year
  const options = useMemo(() => {
    const known = new Set(skuOptions.map((option) => option.sku))
    const missing = (manager?.skus ?? []).filter((sku) => !known.has(sku)).map((sku): SkuOption => ({ sku, title: '' }))
    return [...skuOptions, ...missing]
  }, [skuOptions, manager])

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

      <FormField label="Products" htmlFor="pm-skus" required error={errors.skus?.message} hint="Amazon SKUs this manager looks after. Their sales and ACoS are taken from these SKUs only.">
        <Controller
          control={control}
          name="skus"
          render={({ field }) => (
            <SearchableSelect<SkuOption>
              id="pm-skus"
              multiple
              options={options}
              value={options.filter((option) => field.value.includes(option.sku))}
              onChange={(picked) => field.onChange(picked.map((option) => option.sku))}
              getKey={(option) => option.sku}
              getLabel={(option) => (option.title ? `${option.sku} · ${option.title}` : option.sku)}
              renderOption={(option) => (
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{option.sku}</span>
                  {option.title && <span className="truncate text-xs text-text-muted">{option.title}</span>}
                </span>
              )}
              renderValue={(picked) => (picked.length === 1 ? picked[0].sku : `${picked.length} products`)}
              loading={isFetching}
              searchable
              placeholder="Select products"
              searchPlaceholder="Search by SKU or title..."
              emptyText={isFetching ? 'Loading products...' : 'Nothing matches.'}
              error={errors.skus?.message}
            />
          )}
        />
      </FormField>

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
