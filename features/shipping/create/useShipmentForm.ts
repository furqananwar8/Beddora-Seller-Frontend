'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useGetProvincesQuery } from '@/services/api/geo.api'
import type { LabelFormat, ShipFromOption } from '../types'
import { convertPackageValue, newShipmentValues, PACKAGE_FIELDS, packageText, type UnitSystem, type WizardStep } from './shipmentForm'
import { countErrors, toShipmentRequest } from './shipmentRequest'
import { ADDRESS_FIELDS, shipmentSchema, type Lane, type ShipmentFormValues } from './shipmentSchema'
import { useDraftRates } from './useDraftRates'

/**
 * The shipment wizard shared by Create shipment and Book order: one react-hook-form form (validated by the zod
 * schema of the current lane) plus what isn't form data: the step, the picked rate and the label format. Going
 * back keeps everything; any change to what is quoted clears the picked rate and the rates are fetched again.
 */
export function useShipmentForm(addresses: ShipFromOption[]) {
  const [step, setStep] = useState<WizardStep>(0)
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null)
  const [labelFormat, setLabelFormat] = useState<LabelFormat | null>(null)

  // The resolver is built once and reads the lane inputs as they are when it runs
  const laneInputs = useRef({ addresses, needsProvince: false })
  laneInputs.current.addresses = addresses
  const resolver = useCallback<Resolver<ShipmentFormValues>>((values, context, options) => {
    const from = laneInputs.current.addresses.find((address) => address.id === values.shipFromId)
    const country = values.shipTo.address.country
    const lane: Lane = { crossBorder: Boolean(from && country && from.countryCode !== country), toUs: country === 'US', needsProvince: laneInputs.current.needsProvince }
    return zodResolver(shipmentSchema(lane))(values, context, options) as ReturnType<Resolver<ShipmentFormValues>>
  }, [])

  const form = useForm<ShipmentFormValues>({ resolver, mode: 'onChange', defaultValues: newShipmentValues() })
  const { control, getValues, setValue, trigger, reset, formState } = form
  const values = useWatch({ control }) as ShipmentFormValues

  // Lane: the ship-from and ship-to countries decide what customs needs, and the province only where the country has them
  const shipFrom = addresses.find((address) => address.id === values.shipFromId)
  const country = values.shipTo.address.country
  const { data: provinceList } = useGetProvincesQuery(country, { skip: !country })
  const needsProvince = (provinceList?.provinces.length ?? 0) > 0
  laneInputs.current.needsProvince = needsProvince
  const crossBorder = Boolean(shipFrom && country && shipFrom.countryCode !== country)
  const laneKey = `${crossBorder}|${country === 'US'}|${needsProvince}`

  // A lane change moves the requirements (HS code, origin, province): show them on the steps that have them
  const laneChecked = useRef(laneKey)
  useEffect(() => {
    if (laneChecked.current === laneKey) return
    laneChecked.current = laneKey
    if (step >= 1) void trigger()
  }, [laneKey, step, trigger])

  // Package fields the user didn't type follow the products (dimensions of the first, weight of all)
  const dirtyPackage = formState.dirtyFields.pkg
  useEffect(() => {
    const derived = packageText(values.products, values.units)
    PACKAGE_FIELDS.forEach((field) => {
      if (!dirtyPackage?.[field] && getValues(`pkg.${field}`) !== derived[field]) setValue(`pkg.${field}`, derived[field], { shouldValidate: true })
    })
  }, [values.products, values.units, dirtyPackage, getValues, setValue])

  /** Switches cm/kg ↔ in/lb: typed values are converted, the rest are re-derived from the products. */
  const changeUnits = useCallback(
    (next: UnitSystem) => {
      const previous = getValues('units')
      if (next === previous) return
      PACKAGE_FIELDS.forEach((field) => {
        if (formState.dirtyFields.pkg?.[field]) setValue(`pkg.${field}`, convertPackageValue(field, getValues(`pkg.${field}`), previous, next), { shouldDirty: true, shouldValidate: true })
      })
      setValue('units', next, { shouldValidate: true })
    },
    [formState.dirtyFields.pkg, getValues, setValue]
  )

  const request = toShipmentRequest(values)
  const { stream, key: requestKey, refetch, reset: resetRates } = useDraftRates(request, step === 2)
  const rate = stream.rates.find((item) => item.rateId === selectedRateId)

  // Anything quoted changed: the picked rate no longer applies
  useEffect(() => setSelectedRateId(null), [requestKey])

  const refetchRates = useCallback(() => {
    setSelectedRateId(null)
    setStep(2)
    refetch()
  }, [refetch])

  /** Moves on from the Address step only when its fields are valid. */
  const continueFromAddress = useCallback(async () => {
    if (await trigger([...ADDRESS_FIELDS])) setStep(1)
  }, [trigger])

  /** Loads a prefilled draft (a channel order) and flags whatever it still lacks. */
  const load = useCallback(
    (draft: ShipmentFormValues, at: WizardStep) => {
      reset(draft)
      setStep(at)
      void trigger()
    },
    [reset, trigger]
  )

  const startOver = useCallback(() => {
    resetRates()
    reset(newShipmentValues())
    setSelectedRateId(null)
    setLabelFormat(null)
    setStep(0)
  }, [reset, resetRates])

  return {
    form,
    values,
    step,
    setStep,
    selectedRateId,
    setSelectedRateId,
    labelFormat,
    setLabelFormat,
    shipFrom,
    crossBorder,
    errorCount: countErrors(formState.errors),
    changeUnits,
    continueFromAddress,
    load,
    startOver,
    stream,
    rate,
    refetchRates,
  }
}

export type ShipmentWizard = ReturnType<typeof useShipmentForm>
