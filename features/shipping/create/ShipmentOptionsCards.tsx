'use client'

import React from 'react'
import { format } from 'date-fns'
import { Controller, useFormContext } from 'react-hook-form'
import { FormField } from '@/components/form-field/FormField'
import { NumericInput } from '@/components/form-field/NumericInput'
import { SingleDatePicker } from '@/components/single-date-picker/SingleDatePicker'
import { SectionCard } from '../shared/Card'
import { numberField, shippingField } from '../shared/fieldStyles'
import { RadioCards } from '../shared/RadioCards'
import { INCOTERM_META } from '../shippingMeta'
import type { Incoterm } from '../types'
import type { ShipmentFormValues } from './shipmentSchema'

interface ShipmentOptionsCardsProps {
  /** Destination country, for the duties card's subtitle. */
  destination: string
  /** Duties only matter across a border. */
  crossBorder: boolean
}

const INCOTERMS = (Object.keys(INCOTERM_META) as Incoterm[]).map((value) => ({ value, ...INCOTERM_META[value] }))

/** Duties (DDP / DAP / DDU) when crossing a border, the pickup date (carriers collect; there is no drop-off) and the extras: signature, insurance, reference. */
export const ShipmentOptionsCards: React.FC<ShipmentOptionsCardsProps> = ({ destination, crossBorder }) => {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ShipmentFormValues>()
  return (
    <div className={`grid gap-4 ${crossBorder ? 'lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)_minmax(0,2fr)]' : 'lg:grid-cols-2'}`}>
      {crossBorder && (
        <SectionCard title="Duties & taxes" subtitle={`who pays at the ${destination || 'destination'} border`}>
          <Controller control={control} name="incoterm" render={({ field }) => <RadioCards name="incoterm" ariaLabel="Duties" options={INCOTERMS} value={field.value} onChange={field.onChange} />} />
          <p className="mt-2 text-xs text-text-muted">Rates that can&apos;t honour the choice are shown as unavailable with the reason.</p>
        </SectionCard>
      )}

      <SectionCard title="Pickup" subtitle="the carrier collects the parcel">
        <FormField label="Pickup date" htmlFor="pickup-date" required error={errors.pickupDate?.message}>
          <Controller
            control={control}
            name="pickupDate"
            render={({ field }) => <SingleDatePicker id="pickup-date" value={field.value} onChange={field.onChange} min={format(new Date(), 'yyyy-MM-dd')} error={errors.pickupDate?.message} />}
          />
        </FormField>
      </SectionCard>

      <SectionCard title="Options">
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input type="checkbox" className="h-4 w-4 accent-primary-600" {...register('signature')} />
            Signature required
          </label>
          <FormField label="Insurance (CAD)" htmlFor="insurance" error={errors.insurance?.message} hint="Leave blank for none">
            <Controller
              control={control}
              name="insurance"
              render={({ field }) => <NumericInput id="insurance" decimal value={field.value} onChange={(event) => field.onChange(event.target.value)} onBlur={field.onBlur} placeholder="0.00" className={numberField(errors.insurance?.message)} />}
            />
          </FormField>
          <FormField label="Reference" htmlFor="reference" error={errors.reference?.message} hint="Marketplace order no.">
            <input id="reference" maxLength={50} placeholder="e.g. SHOP-#10482" className={shippingField(errors.reference?.message)} {...register('reference')} />
          </FormField>
        </div>
      </SectionCard>
    </div>
  )
}
