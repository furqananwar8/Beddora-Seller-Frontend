import { useEffect, useRef } from 'react'
import { UseFormReturn, useWatch } from 'react-hook-form'
import type { ProductFormValues } from './productForm'

type MasterForm = Pick<UseFormReturn<ProductFormValues>, 'control' | 'getValues' | 'setValue'>

/** The master's text fields the variations take from it. */
type SyncedField = 'hsCode' | 'material' | 'packaging'

/**
 * How far a change to the master's value reaches:
 * - `unedited`: only the variations that still have the old value (or none); one set for a SKU is left alone.
 * - `all`: every variation, edited or not. Each can be changed again afterwards, until the master changes next.
 */
type Reach = 'unedited' | 'all'

function useVariationsFollowMaster({ control, getValues, setValue }: MasterForm, field: SyncedField, reach: Reach) {
  const masterValue = useWatch({ control, name: field }) ?? ''
  const previous = useRef<string | null>(null)

  useEffect(() => {
    const before = previous.current
    previous.current = masterValue
    // The first render is the form loading, not a change
    if (before === null || before === masterValue) return
    getValues('variations').forEach((variation, index) => {
      if (reach === 'all' || variation[field].trim() === '' || variation[field] === before) {
        setValue(`variations.${index}.${field}`, masterValue, { shouldDirty: true, shouldValidate: true })
      }
    })
  }, [masterValue, field, reach, getValues, setValue])
}

/**
 * What the master passes down to its variations: a changed HS code reaches the variations still on the old one, while a
 * changed material or packaging reaches all of them (a variation can be edited again afterwards).
 */
export function useMasterDefaultsSync(form: MasterForm) {
  useVariationsFollowMaster(form, 'hsCode', 'unedited')
  useVariationsFollowMaster(form, 'material', 'all')
  useVariationsFollowMaster(form, 'packaging', 'all')
}
