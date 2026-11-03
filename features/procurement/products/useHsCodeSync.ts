import { useEffect, useRef } from 'react'
import { UseFormReturn, useWatch } from 'react-hook-form'
import type { ProductFormValues } from './productForm'

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
