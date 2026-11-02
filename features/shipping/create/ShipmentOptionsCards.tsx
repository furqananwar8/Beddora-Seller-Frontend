'use client'

import React from 'react'
import { format } from 'date-fns'
import { FormField } from '@/components/form-field/FormField'
import { NumericInput } from '@/components/form-field/NumericInput'
import { SingleDatePicker } from '@/components/single-date-picker/SingleDatePicker'
import { SectionCard } from '../shared/Card'
import { numberField, shippingField } from '../shared/fieldStyles'
import { RadioCards } from '../shared/RadioCards'
import { HANDOVER_META, INCOTERM_META } from '../shippingMeta'
import type { Handover, Incoterm } from '../types'
import type { DraftAction, ShipmentOptions } from './shipmentDraft'
import type { FieldErrors } from './shipmentRules'

interface ShipmentOptionsCardsProps {
  options: ShipmentOptions
  errors: FieldErrors
  /** Destination country, for the duties card's subtitle. */
  destination: string
  dispatch: React.Dispatch<DraftAction>
}

const INCOTERMS = (Object.keys(INCOTERM_META) as Incoterm[]).map((value) => ({ value, ...INCOTERM_META[value] }))
const HANDOVERS = (Object.keys(HANDOVER_META) as Handover[]).map((value) => ({ value, ...HANDOVER_META[value] }))

/** Duties (DDP / DAP / DDU), handover (drop-off / pickup with its date) and the extras: signature, insurance, reference. */
export const ShipmentOptionsCards: React.FC<ShipmentOptionsCardsProps> = ({ options, errors, destination, dispatch }) => {
  const patch = (value: Partial<ShipmentOptions>) => dispatch({ type: 'patchOptions', patch: value })
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)_minmax(0,2fr)]">
      <SectionCard title="Duties & taxes" subtitle={`who pays at the ${destination || 'destination'} border`}>
        <RadioCards name="incoterm" ariaLabel="Duties" options={INCOTERMS} value={options.incoterm} onChange={(incoterm) => patch({ incoterm })} />
        <p className="mt-2 text-xs text-text-muted">Rates that can&apos;t honour the choice are shown as unavailable with the reason.</p>
      </SectionCard>

      <SectionCard title="Handover">
        <RadioCards name="handover" ariaLabel="Handover" columns={2} options={HANDOVERS} value={options.handover} onChange={(handover) => patch({ handover, pickupDate: handover === 'PICKUP' ? options.pickupDate : '' })} />
        {options.handover === 'PICKUP' && (
          <FormField label="Pickup date" htmlFor="pickup-date" required error={errors.pickupDate} className="mt-3">
            <SingleDatePicker id="pickup-date" value={options.pickupDate} onChange={(pickupDate) => patch({ pickupDate })} min={format(new Date(), 'yyyy-MM-dd')} error={errors.pickupDate} />
          </FormField>
        )}
      </SectionCard>

      <SectionCard title="Options">
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-text-primary">
            <input type="checkbox" checked={options.signature} onChange={(event) => patch({ signature: event.target.checked })} className="h-4 w-4 accent-primary-600" />
            Signature required
          </label>
          <FormField label="Insurance (CAD)" htmlFor="insurance" error={errors.insurance} hint="Leave blank for none">
            <NumericInput id="insurance" decimal value={options.insurance} onChange={(event) => patch({ insurance: event.target.value })} placeholder="0.00" className={numberField(errors.insurance)} />
          </FormField>
          <FormField label="Reference" htmlFor="reference" error={errors.reference} hint="Marketplace order no.">
            <input id="reference" value={options.reference} maxLength={50} onChange={(event) => patch({ reference: event.target.value })} placeholder="e.g. SHOP-#10482" className={shippingField(errors.reference)} />
          </FormField>
        </div>
      </SectionCard>
    </div>
  )
}
