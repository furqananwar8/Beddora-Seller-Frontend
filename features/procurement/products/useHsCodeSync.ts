import { useEffect, useRef } from 'react'
import { UseFormReturn, useWatch } from 'react-hook-form'
import { useGetProductHsCodesQuery, type CategoryRef } from '@/services/api/procurement.api'
import type { ProductFormValues } from './productForm'

/**
 * Picking a category fills the master's HS code with that category's default (the shipping customs catalogue), but
 * only while it is still empty: a code someone chose is never replaced. Loading a saved product changes nothing.
 */
export function useCategoryHsCode<T extends { category: CategoryRef | null; hsCode: string }>({
  control,
  getValues,
  setValue,
}: Pick<UseFormReturn<T>, 'control' | 'getValues' | 'setValue'>) {
  const form = { control, getValues, setValue } as unknown as Pick<UseFormReturn<{ category: CategoryRef | null; hsCode: string }>, 'control' | 'getValues' | 'setValue'>
  const { data: catalogue } = useGetProductHsCodesQuery()
  const category = useWatch({ control: form.control, name: 'category' })
  const categoryId = category?.id ?? null
  // undefined until the first render: the category a saved product loads with is not a change
  const previous = useRef<number | null | undefined>(undefined)

  useEffect(() => {
    const before = previous.current
    previous.current = categoryId
    if (before === undefined || before === categoryId || !catalogue || !category) return
    if (String(form.getValues('hsCode') ?? '').trim() !== '') return
    const name = category.name.trim().toLowerCase()
    const match = catalogue.find((option) => option.categories.some((c) => c.toLowerCase() === name))
    if (match) form.setValue('hsCode', match.code, { shouldDirty: true, shouldValidate: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, catalogue])
}

/**
 * A variation starts from the master's HS code: when the master's changes, every variation that still has the old
 * one (or none) follows it, while a code someone set for one SKU is left alone. A new row is prefilled by `newVariation`.
 */
export function useHsCodeSync({ control, getValues, setValue }: Pick<UseFormReturn<ProductFormValues>, 'control' | 'getValues' | 'setValue'>) {
  const masterCode = useWatch({ control, name: 'hsCode' }) ?? ''
  const previous = useRef<string | null>(null)

  useEffect(() => {
    const before = previous.current
    previous.current = masterCode
    if (before === null || before === masterCode) return
    getValues('variations').forEach((variation, index) => {
      if (variation.hsCode.trim() === '' || variation.hsCode === before) {
        setValue(`variations.${index}.hsCode`, masterCode, { shouldDirty: true, shouldValidate: true })
      }
    })
  }, [masterCode, getValues, setValue])
}
