'use client'

import React from 'react'
import { UseFormReturn, useWatch } from 'react-hook-form'
import { FormField } from '@/components/form-field/FormField'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards/Card'
import type { LengthUnit, WeightUnit } from '@/services/api/procurement.api'
import { CbmField, DimensionsField, WeightField } from '../shared/MeasurementFields'
import { convertLength, convertWeight } from '../shared/units'
import { derivedCbm, type ProductFormValues } from './productForm'

const convertText = (value: string, convert: (n: number) => number) =>
  value.trim() === '' || !Number.isFinite(Number(value)) ? value : String(convert(Number(value)))

/**
 * Flipping a unit re-expresses every typed value in the form that uses it: the master's and those of
 * variations keeping their own dimensions, so a value never silently changes meaning.
 */
export function useUnitSwitch(form: UseFormReturn<ProductFormValues>) {
  const { getValues, setValue } = form

  const switchWeight = (unit: WeightUnit, convertedMaster: string) => {
    const from = getValues('weightUnit')
    setValue('weightUnit', unit, { shouldDirty: true })
    setValue('weight', convertedMaster, { shouldDirty: true })
    getValues('variations').forEach((variation, index) => {
      if (!variation.inheritsMaster) setValue(`variations.${index}.weight`, convertText(variation.weight, (n) => convertWeight(n, from, unit)))
    })
  }

  const switchLength = (unit: LengthUnit, convertedMaster: { length: string; width: string; height: string }) => {
    const from = getValues('dimensionUnit')
    setValue('dimensionUnit', unit, { shouldDirty: true })
    ;(['length', 'width', 'height'] as const).forEach((part) => setValue(part, convertedMaster[part], { shouldDirty: true }))
    getValues('variations').forEach((variation, index) => {
      if (variation.inheritsMaster) return
      ;(['length', 'width', 'height'] as const).forEach((part) =>
        setValue(`variations.${index}.${part}`, convertText(variation[part], (n) => convertLength(n, from, unit)))
      )
    })
  }

  return { switchWeight, switchLength }
}

interface ProductShippingSectionProps {
  form: UseFormReturn<ProductFormValues>
  readOnly: boolean
}

export const ProductShippingSection: React.FC<ProductShippingSectionProps> = ({ form, readOnly }) => {
  const {
    setValue,
    control,
    formState: { errors },
  } = form
  const [weight, weightUnit, length, width, height, dimensionUnit, cbm, cbmTouched] = useWatch({
    control,
    name: ['weight', 'weightUnit', 'length', 'width', 'height', 'dimensionUnit', 'cbm', 'cbmTouched'],
  })
  const { switchWeight, switchLength } = useUnitSwitch(form)
  const shownCbm = derivedCbm({ length, width, height, cbm, cbmTouched }, dimensionUnit)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipping dimensions</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)]">
        <FormField label="Weight" htmlFor="product-weight" error={errors.weight?.message}>
          <WeightField
            id="product-weight"
            value={weight}
            unit={weightUnit}
            onChange={(value) => setValue('weight', value, { shouldDirty: true, shouldValidate: Boolean(errors.weight) })}
            onUnitChange={switchWeight}
            error={errors.weight?.message}
            disabled={readOnly}
          />
        </FormField>

        <FormField label="Dimensions (L × W × H)" htmlFor="product-dims-length" error={errors.length?.message ?? errors.width?.message ?? errors.height?.message}>
          <DimensionsField
            idPrefix="product-dims"
            value={{ length, width, height }}
            unit={dimensionUnit}
            onChange={(next) => (['length', 'width', 'height'] as const).forEach((part) => setValue(part, next[part], { shouldDirty: true }))}
            onUnitChange={switchLength}
            errors={{ length: errors.length?.message, width: errors.width?.message, height: errors.height?.message }}
            disabled={readOnly}
          />
        </FormField>

        <FormField label="CBM" htmlFor="product-cbm">
          <CbmField
            id="product-cbm"
            value={shownCbm}
            overridden={cbmTouched}
            onOverride={(value) => {
              setValue('cbm', value, { shouldDirty: true })
              setValue('cbmTouched', true)
            }}
            onUseCalculated={() => {
              setValue('cbmTouched', false, { shouldDirty: true })
              setValue('cbm', '')
            }}
            error={errors.cbm?.message}
            disabled={readOnly}
          />
        </FormField>
      </CardContent>
    </Card>
  )
}
