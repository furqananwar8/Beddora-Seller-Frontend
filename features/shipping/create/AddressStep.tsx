'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { AddressFields } from '@/components/address-fields/AddressFields'
import { FormField, fieldClass } from '@/components/form-field/FormField'
import { PhoneField } from '@/components/phone-field/PhoneField'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { Button } from '@/design-system/buttons'
import type { SavedShipFromAddress } from '@/features/inventory/shipments/types'
import { useGetProvincesQuery } from '@/services/api/geo.api'
import { SectionCard } from '../shared/Card'
import type { DraftAction, ShipmentDraft, ShipToDraft } from './shipmentDraft'
import { addressErrors, isCrossBorder, type FieldErrors } from './shipmentRules'
import { WizardFooter } from './WizardFooter'

interface AddressStepProps {
  draft: ShipmentDraft
  dispatch: React.Dispatch<DraftAction>
  addresses: SavedShipFromAddress[]
  loadingAddresses: boolean
  shipFrom: SavedShipFromAddress | undefined
  onCancel: () => void
}

const RESIDENTIAL_OPTIONS = [
  { value: 'RESIDENTIAL' as const, label: 'Residential' },
  { value: 'BUSINESS' as const, label: 'Business' },
]

/** A saved ship-from address as a small card. */
export const ShipFromCard: React.FC<{ address: SavedShipFromAddress }> = ({ address }) => (
  <div className="rounded-lg bg-secondary-50 p-3 text-sm leading-6 text-text-secondary">
    <span className="font-semibold text-text-primary">{address.companyName || address.name}</span>
    {address.companyName && <span> · {address.name}</span>}
    <br />
    {[address.addressLine1, address.addressLine2].filter(Boolean).join(', ')}
    <br />
    {address.city}, {address.stateOrProvinceCode} {address.postalCode} · {address.countryCode}
    <br />
    <span className="text-text-muted">{[address.phoneNumber, address.email].filter(Boolean).join(' · ')}</span>
  </div>
)

/** Step 1's address errors; the province is only required where the country lists provinces. */
export function useAddressErrors(draft: ShipmentDraft) {
  const country = draft.shipTo.address.country
  const { data: provinceList } = useGetProvincesQuery(country, { skip: !country })
  const needsProvince = (provinceList?.provinces.length ?? 0) > 0
  return useMemo(() => addressErrors(draft, needsProvince), [draft, needsProvince])
}

interface AddressSectionProps {
  draft: ShipmentDraft
  dispatch: React.Dispatch<DraftAction>
  /** Errors to show (empty until the user tried to continue). */
  shown: FieldErrors
}

/** Pick the saved ship-from address, shown as a card. */
export const ShipFromSection: React.FC<AddressSectionProps & { addresses: SavedShipFromAddress[]; loadingAddresses: boolean; shipFrom: SavedShipFromAddress | undefined }> = ({ dispatch, shown, addresses, loadingAddresses, shipFrom }) => (
  <SectionCard title="Ship from" subtitle="saved addresses">
    <FormField label="Address" htmlFor="ship-from" required error={shown.shipFrom}>
      <SearchableSelect<SavedShipFromAddress>
        id="ship-from"
        value={shipFrom ?? null}
        onChange={(address) => dispatch({ type: 'setShipFrom', id: address.id })}
        options={addresses}
        getKey={(address) => address.id}
        getLabel={(address) => `${address.label}${address.isDefault ? ' (default)' : ''}`}
        loading={loadingAddresses}
        placeholder="Select address"
        searchPlaceholder="Search addresses..."
        emptyText="No saved addresses yet."
        error={shown.shipFrom}
      />
    </FormField>
    {shipFrom && <ShipFromCard address={shipFrom} />}
    <p className="mt-3 text-xs text-text-muted">
      Manage addresses in{' '}
      <Link href="/dashboard/settings/addresses" className="text-primary-600 hover:underline">
        Settings › Addresses
      </Link>
    </p>
  </SectionCard>
)

/** The customer's address, phone and email, residential or business. */
export const ShipToSection: React.FC<AddressSectionProps> = ({ draft, dispatch, shown }) => {
  const { shipTo } = draft
  const patch = (value: Partial<ShipToDraft>) => dispatch({ type: 'patchShipTo', patch: value })
  const input = (key: 'name' | 'company' | 'address1' | 'address2' | 'email', placeholder?: string) => (
    <input id={`ship-to-${key}`} value={shipTo[key]} onChange={(event) => patch({ [key]: event.target.value })} placeholder={placeholder} className={fieldClass(shown[key])} autoComplete="off" />
  )
  return (
    <SectionCard
      title="Ship to"
      subtitle="customer"
      aside={
        <SegmentedToggle
          ariaLabel="Residential or business address"
          value={shipTo.residential ? 'RESIDENTIAL' : 'BUSINESS'}
          onChange={(value) => patch({ residential: value === 'RESIDENTIAL' })}
          options={RESIDENTIAL_OPTIONS}
        />
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Full name" htmlFor="ship-to-name" required error={shown.name}>
          {input('name')}
        </FormField>
        <FormField label="Company" htmlFor="ship-to-company">
          {input('company', 'Optional')}
        </FormField>
        <FormField label="Address line 1" htmlFor="ship-to-address1" required error={shown.address1}>
          {input('address1')}
        </FormField>
        <FormField label="Address line 2" htmlFor="ship-to-address2">
          {input('address2', 'Apt, suite, unit')}
        </FormField>
        <AddressFields idPrefix="ship-to" value={shipTo.address} onChange={(address) => patch({ address })} errors={shown} />
        <FormField label="Phone" htmlFor="ship-to-phone-number" required error={shown.phone} hint="The calling code follows the country">
          <PhoneField idPrefix="ship-to-phone" value={shipTo.phone} onChange={(phone) => patch({ phone })} error={shown.phone} />
        </FormField>
        <FormField label="Email" htmlFor="ship-to-email" error={shown.email} hint="Used for carrier delivery notifications">
          {input('email')}
        </FormField>
      </div>
    </SectionCard>
  )
}

/** Step 1: where the parcel ships from (saved addresses) and to (the customer). Errors show once Continue is pressed. */
export const AddressStep: React.FC<AddressStepProps> = ({ draft, dispatch, addresses, loadingAddresses, shipFrom, onCancel }) => {
  const [attempted, setAttempted] = useState(false)
  const { shipTo } = draft
  const errors = useAddressErrors(draft)
  const shown = attempted ? errors : {}

  const next = () => {
    setAttempted(true)
    if (Object.keys(errors).length === 0) dispatch({ type: 'goTo', step: 1 })
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <ShipFromSection draft={draft} dispatch={dispatch} shown={shown} addresses={addresses} loadingAddresses={loadingAddresses} shipFrom={shipFrom} />
        <ShipToSection draft={draft} dispatch={dispatch} shown={shown} />
      </div>

      {isCrossBorder(draft, shipFrom) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold">Cross-border</span>
          {shipFrom?.countryCode} → {shipTo.address.country} shipment: customs lines and a duties option are required in the next step.
        </div>
      )}

      <WizardFooter
        start={
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        }
        hint={attempted && Object.keys(errors).length > 0 ? `Fill the ${Object.keys(errors).length} highlighted fields to continue` : undefined}
      >
        <Button onClick={next}>Continue to Shipment Info →</Button>
      </WizardFooter>
    </>
  )
}
