import { useEffect, useRef } from 'react'
import { UseFormReturn, useWatch } from 'react-hook-form'
import { variantNameOf, type ProductFormValues } from './productForm'

/** What a variant name is built from; when it changes, the name is rebuilt. */
const sourceOf = (masterName: string, color: string, sizeName: string) => [masterName, color, sizeName].map((part) => part.trim()).join('\u0000')

/**
 * Keeps each variation's name in step with the master name, its color and its size: changing any of them
 * rebuilds `Name-Color-Size`, while a name typed in between is left alone until the next such change.
 * Rows seen for the first time (loaded or just added) keep the name they came with.
 */
export function useVariantNameSync({ control, setValue }: Pick<UseFormReturn<ProductFormValues>, 'control' | 'setValue'>) {
  const [masterName, variations] = useWatch({ control, name: ['name', 'variations'] })
  const sources = useRef(new Map<string, string>())

  useEffect(() => {
    const next = new Map<string, string>()
    ;(variations ?? []).forEach((variation, index) => {
      const source = sourceOf(masterName ?? '', variation.color, variation.sizeName)
      const previous = sources.current.get(variation.clientKey)
      if (previous !== undefined && previous !== source) {
        setValue(`variations.${index}.variantName`, variantNameOf(masterName ?? '', variation.color, variation.sizeName), { shouldDirty: true, shouldValidate: true })
      }
      next.set(variation.clientKey, source)
    })
    sources.current = next
  }, [masterName, variations, setValue])
}
