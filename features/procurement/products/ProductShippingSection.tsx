'use client'

import React from 'react'
import { UseFormReturn, useWatch } from 'react-hook-form'
import { FormField } from '@/components/form-field/FormField'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards/Card'
import type { LengthUnit, WeightUnit } from '@/services/api/procurement.api'
import { WeightField } from '../shared/MeasurementFields'
import { convertLength, convertWeight } from '../shared/units'
import type { ProductFormValues } from './productForm'

const convertText = (value: string, convert: (n: number) => number) =>
  value.trim() === '' || !Number.isFinite(Number(value)) ? value : String(convert(Number(value)))

/**
 * Flipping a unit re-expresses every typed value in the form that uses it, so a value never silently changes meaning:
 * weight on the master and on variations with their own weight; dimensions on every variation (the master has none).
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

  const switchLength = (unit: LengthUnit) => {
    const from = getValues('dimensionUnit')
    if (from === unit) return
    setValue('dimensionUnit', unit, { shouldDirty: true })
    getValues('variations').forEach((variation, index) => {
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

/** The master's weight, the default its variations inherit. Dimensions and CBM are set per variation. */
export const ProductShippingSection: React.FC<ProductShippingSectionProps> = ({ form, readOnly }) => {
  const {
    setValue,
    control,
    formState: { errors },
  } = form
  const [weight, weightUnit] = useWatch({ control, name: ['weight', 'weightUnit'] })
  const { switchWeight } = useUnitSwitch(form)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shipping weight</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-3">
        <FormField label="Weight" htmlFor="product-weight" error={errors.weight?.message} hint="Default for variations; dimensions and CBM are set on each variation">
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
      </CardContent>
    </Card>
  )
}
