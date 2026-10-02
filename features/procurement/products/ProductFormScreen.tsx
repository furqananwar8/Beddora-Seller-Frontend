'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppAbility } from '@/hooks/useAppAbility'
import {
  useCreatePoProductMutation,
  useGetPoProductQuery,
  useRemovePoProductPhotoMutation,
  useUpdatePoProductMutation,
  useUploadPoProductPhotoMutation,
  type PoProductFamily,
} from '@/services/api/procurement.api'
import { applyServerIssues } from '@/utils/apiErrors'
import { ProcurementTabs } from '../shared/ProcurementTabs'
import { ProductBasicsSection } from './ProductBasicsSection'
import { ProductShippingSection } from './ProductShippingSection'
import { emptyProductValues, fromFamily, newVariation, productFormSchema, toProductBody, type ProductFormValues } from './productForm'
import { VariationsSection } from './VariationsSection'

const LIST = '/dashboard/procurement/products'

const MASTER_FIELDS = new Set(['name', 'sku', 'category', 'material', 'packaging', 'sizeName', 'sizeValue', 'description', 'weight', 'length', 'width', 'height', 'cbm'])
const isFormField = (field: string) => MASTER_FIELDS.has(field) || /^variations\.\d+\./.test(field)

interface ProductFormScreenProps {
  /** Edit mode: the product (master or variation) to open. */
  productId?: number
}

export const ProductFormScreen: React.FC<ProductFormScreenProps> = ({ productId }) => {
  const router = useRouter()
  const params = useSearchParams()
  const copyFrom = Number(params.get('from')) || undefined
  const addVariation = params.get('addVariation') === '1'
  const ability = useAppAbility()
  const readOnly = !ability.can('write', 'procurement:products')
  const { success, failure } = useApiFeedback()

  const sourceId = productId ?? copyFrom
  const { data: family, isLoading, isError } = useGetPoProductQuery(sourceId ?? 0, { skip: !sourceId })
  const editing = productId !== undefined ? family : undefined

  const form = useForm<ProductFormValues>({ resolver: zodResolver(productFormSchema), defaultValues: emptyProductValues, mode: 'onTouched' })
  const { handleSubmit, reset, setError, formState } = form

  const [photo, setPhoto] = useState<File | null>(null)
  const [variationPhotos, setVariationPhotos] = useState<Map<string, File>>(new Map())
  const [saving, setSaving] = useState(false)

  // Load the product (or the one being duplicated) into the form once
  const hydrated = useRef<number | null>(null)
  useEffect(() => {
    if (!family || hydrated.current === family.id) return
    hydrated.current = family.id
    const values = fromFamily(family, productId === undefined)
    if (addVariation && productId !== undefined) values.variations.push(newVariation(values))
    reset(values)
  }, [family, productId, addVariation, reset])

  const setVariationPhoto = (key: string, file: File | null) =>
    setVariationPhotos((current) => {
      const next = new Map(current)
      if (file) next.set(key, file)
      else next.delete(key)
      return next
    })

  const [createProduct] = useCreatePoProductMutation()
  const [updateProduct] = useUpdatePoProductMutation()
  const [uploadPhoto] = useUploadPoProductPhotoMutation()
  const [removePhoto] = useRemovePoProductPhotoMutation()

  /** Photo uploads and removals after the product saved. Returns the labels of any that failed. */
  const syncPhotos = async (saved: PoProductFamily, values: ProductFormValues): Promise<string[]> => {
    const failed: string[] = []
    const run = async (label: string, job: () => Promise<unknown>) => {
      try {
        await job()
      } catch {
        failed.push(label)
      }
    }
    if (photo) await run(saved.sku, () => uploadPhoto({ id: saved.id, file: photo }).unwrap())
    else if (values.removePhoto) await run(saved.sku, () => removePhoto(saved.id).unwrap())

    const bySku = new Map(saved.variations.map((variation) => [variation.sku, variation.id]))
    for (const variation of values.variations) {
      const id = bySku.get(variation.sku.trim().toUpperCase())
      if (id === undefined) continue
      const file = variationPhotos.get(variation.clientKey)
      if (file) await run(variation.sku, () => uploadPhoto({ id, file }).unwrap())
      else if (variation.removePhoto) await run(variation.sku, () => removePhoto(id).unwrap())
    }
    return failed
  }

  const submit = handleSubmit(async (values) => {
    setSaving(true)
    try {
      const body = toProductBody(values, editing?.updatedAt)
      const saved = editing ? await updateProduct({ id: editing.id, body }).unwrap() : await createProduct(body).unwrap()
      const failedPhotos = await syncPhotos(saved, values)
      if (failedPhotos.length) {
        failure(null, `Product saved, but the photo for ${failedPhotos.join(', ')} could not be uploaded. Try again here.`)
        hydrated.current = null
        router.replace(`${LIST}/${saved.id}`)
        return
      }
      success(editing ? 'Product saved' : 'Product created')
      router.push(LIST)
    } catch (error) {
      if (!applyServerIssues(error, setError, isFormField)) failure(error, 'Could not save the product')
    } finally {
      setSaving(false)
    }
  })

  if (sourceId && isLoading) {
    return (
      <Container size="full" className="flex justify-center py-16">
        <Spinner />
      </Container>
    )
  }

  if (sourceId && (isError || !family)) {
    return (
      <Container size="full" className="py-16 text-center">
        <p className="font-medium text-text-primary">This product could not be found.</p>
        <Link href={LIST} className="mt-2 inline-block text-sm text-primary-600 hover:underline">
          Back to products
        </Link>
      </Container>
    )
  }

  const title = editing ? `${readOnly ? 'Product' : 'Edit product'} · ${editing.sku}` : copyFrom ? 'Duplicate product' : 'New product'
  const variationErrors = Array.isArray(formState.errors.variations) ? formState.errors.variations.filter(Boolean).length : 0

  return (
    <Container size="full" className="py-4 sm:py-8">
      <ProcurementTabs />

      <form onSubmit={submit} noValidate className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <nav aria-label="Breadcrumb" className="text-sm text-text-muted">
              <Link href={LIST} className="text-primary-600 hover:underline">
                Products
              </Link>
              <span> / {editing?.name ?? (copyFrom ? `Copy of ${family?.name}` : 'New product')}</span>
            </nav>
            <h1 className="truncate text-xl font-bold text-text-primary sm:text-2xl">{title}</h1>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => router.push(LIST)} disabled={saving}>
              {readOnly ? 'Back' : 'Cancel'}
            </Button>
            {!readOnly && (
              <Button type="submit" className="flex-1 sm:flex-none" isLoading={saving}>
                Save product
              </Button>
            )}
          </div>
        </div>

        {variationErrors > 0 && (
          <p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
            {variationErrors === 1 ? 'A variation needs attention' : `${variationErrors} variations need attention`}. Check the highlighted rows.
          </p>
        )}

        <ProductBasicsSection form={form} product={editing} photo={photo} onPhotoChange={setPhoto} readOnly={readOnly} />
        <ProductShippingSection form={form} readOnly={readOnly} />
        <VariationsSection
          form={form}
          productId={editing?.id}
          version={editing?.updatedAt}
          photos={variationPhotos}
          onPhotoChange={setVariationPhoto}
          readOnly={readOnly}
        />
      </form>
    </Container>
  )
}
