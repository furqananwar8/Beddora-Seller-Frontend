'use client'

import React from 'react'
import { Controller, UseFormReturn } from 'react-hook-form'
import { FormField, fieldClass } from '@/components/form-field/FormField'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards/Card'
import { CategorySelect } from '../shared/CategorySelect'
import { PhotoField } from './PhotoField'
import type { ProductFormValues } from './productForm'
import { SkuInput } from './SkuInput'

interface ProductBasicsSectionProps {
  form: UseFormReturn<ProductFormValues>
  /** Saved master, for the SKU check and its photo; absent while creating. */
  product?: { id: number; updatedAt: string }
  photo: File | null
  onPhotoChange: (file: File | null) => void
  readOnly: boolean
}

export const ProductBasicsSection: React.FC<ProductBasicsSectionProps> = ({ form, product, photo, onPhotoChange, readOnly }) => {
  const {
    register,
    control,
    setError,
    watch,
    setValue,
    formState: { errors },
  } = form

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic information</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FormField label="Name" htmlFor="product-name" required error={errors.name?.message} hint="First part of every variant name">
          <input id="product-name" autoComplete="off" className={fieldClass(errors.name?.message)} disabled={readOnly} {...register('name')} />
        </FormField>

        <FormField label="SKU (optional)" htmlFor="product-sku" error={errors.sku?.message} hint="Unique across all masters and variations when given">
          <SkuInput
            id="product-sku"
            productId={product?.id}
            error={errors.sku?.message}
            disabled={readOnly}
            onTaken={(sku) => setError('sku', { type: 'server', message: `SKU ${sku} is already used by another product` })}
            {...register('sku')}
          />
        </FormField>

        <FormField label="Category" htmlFor="product-category" error={errors.category?.message as string | undefined} hint="Every variation takes this category">
          <Controller
            control={control}
            name="category"
            render={({ field }) => <CategorySelect id="product-category" value={field.value} onChange={field.onChange} canAdd={!readOnly} disabled={readOnly} />}
          />
        </FormField>

        <FormField label="Fabric / material" htmlFor="product-material" error={errors.material?.message} hint="Default for new variations">
          <input id="product-material" autoComplete="off" className={fieldClass(errors.material?.message)} disabled={readOnly} {...register('material')} />
        </FormField>

        <FormField label="Packaging" htmlFor="product-packaging" error={errors.packaging?.message} hint="Default for new variations">
          <input id="product-packaging" autoComplete="off" className={fieldClass(errors.packaging?.message)} disabled={readOnly} {...register('packaging')} />
        </FormField>

        <FormField label="Size" htmlFor="product-size-name" error={errors.sizeName?.message}>
          <input id="product-size-name" autoComplete="off" className={fieldClass(errors.sizeName?.message)} disabled={readOnly} {...register('sizeName')} />
        </FormField>

        <FormField label="Photo (optional)" className="sm:col-span-2">
          <PhotoField
            productId={product?.id}
            version={product?.updatedAt}
            hasSavedPhoto={watch('hasPhoto')}
            removing={watch('removePhoto')}
            onRemoveSaved={(removing) => setValue('removePhoto', removing, { shouldDirty: true })}
            file={photo}
            onFileChange={onPhotoChange}
            disabled={readOnly}
          />
        </FormField>
        <FormField label="Description (optional)" htmlFor="product-description" error={errors.description?.message} className="sm:col-span-2 lg:col-span-3">
          <textarea id="product-description" rows={4} className={`${fieldClass(errors.description?.message)} resize-y`} disabled={readOnly} {...register('description')} />
        </FormField>

      </CardContent>
    </Card>
  )
}
