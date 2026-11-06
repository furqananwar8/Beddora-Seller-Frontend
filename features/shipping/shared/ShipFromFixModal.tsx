'use client'

import React, { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormField, fieldClass } from '@/components/form-field/FormField'
import { EMPTY_PHONE, fromInternational, isValidPhone, PhoneField, toInternational, type PhoneValue } from '@/components/phone-field/PhoneField'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useGetCompanyDetailsQuery, useUpdateCompanyDetailsMutation } from '@/services/api/companyDetails.api'
import { useGetWarehousesQuery, useUpdateWarehouseMutation } from '@/services/api/warehouses.api'
import type { ShipFromFix, ShipFromOption } from '../types'

interface Values {
  companyName: string
  phone: PhoneValue
  postalCode: string
}

/** Only the gaps of this ship-from are required; the rest of the form is left as it is. */
const schemaFor = (fix: ShipFromFix[]) =>
  z.object({
    companyName: fix.includes('companyName') ? z.string().trim().min(1, 'Company name is required').max(120, 'Company name is too long') : z.string(),
    phone: z.custom<PhoneValue>().refine((phone) => !fix.includes('companyPhone') || isValidPhone(phone), 'Enter a valid phone number for this country'),
    postalCode: fix.includes('postalCode') ? z.string().trim().min(1, 'Postal code is required').max(12, 'Postal code is too long') : z.string(),
  })

const EMPTY: Values = { companyName: '', phone: EMPTY_PHONE, postalCode: '' }
const warehouseIdOf = (address: ShipFromOption) => Number(address.id.split(':')[1])

interface ShipFromFixModalProps {
  /** The ship-from that can't be quoted yet; null while the modal is closed. */
  address: ShipFromOption | null
  onClose: () => void
}

/**
 * Completes a ship-from in place: the company name and phone a warehouse ships under (Settings › Company) and the
 * warehouse's postal code (Settings › Warehouses), without leaving the booking. Saving refreshes the ship-from
 * options, so the address stops being flagged.
 */
export const ShipFromFixModal: React.FC<ShipFromFixModalProps> = ({ address, onClose }) => {
  const { success, failure } = useApiFeedback()
  const fix = useMemo(() => address?.fix ?? [], [address])
  const needsCompany = fix.includes('companyName') || fix.includes('companyPhone')
  const needsWarehouse = fix.includes('postalCode')
  const { data: company } = useGetCompanyDetailsQuery(undefined, { skip: !address || !needsCompany })
  const { data: warehouses } = useGetWarehousesQuery({ page: 1, limit: 100 }, { skip: !address || !needsWarehouse })
  const warehouse = address && needsWarehouse ? warehouses?.data.find((item) => item.id === warehouseIdOf(address)) : undefined
  const [saveCompany, { isLoading: savingCompany }] = useUpdateCompanyDetailsMutation()
  const [saveWarehouse, { isLoading: savingWarehouse }] = useUpdateWarehouseMutation()
  const saving = savingCompany || savingWarehouse

  const schema = useMemo(() => schemaFor(fix), [fix])
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY })

  // Start from what is on record, so only the gaps are typed
  useEffect(() => {
    if (!address) return
    reset({ companyName: company?.name ?? '', phone: company ? fromInternational(company.phone, company.phoneCountry || address.countryCode) : { ...EMPTY_PHONE, country: address.countryCode }, postalCode: warehouse?.postalCode ?? '' })
  }, [address, company, warehouse, reset])

  const ready = (!needsCompany || company) && (!needsWarehouse || warehouse)

  const submit = handleSubmit(async (values) => {
    try {
      if (needsCompany && company) await saveCompany({ ...company, name: values.companyName.trim(), phoneCountry: values.phone.number ? values.phone.country : '', phone: toInternational(values.phone) }).unwrap()
      if (needsWarehouse && warehouse) {
        const { id: _id, updatedAt: _updatedAt, ...body } = warehouse
        await saveWarehouse({ id: warehouse.id, body: { ...body, postalCode: values.postalCode.trim() } }).unwrap()
      }
      success('Ship-from details saved')
      onClose()
    } catch (error) {
      failure(error, 'Could not save the ship-from details')
    }
  })

  return (
    <Modal isOpen={address !== null} onClose={saving ? () => undefined : onClose} title={`Complete ${address?.label ?? 'ship-from'}`} size="md">
      <form onSubmit={submit} noValidate className="space-y-4">
        <p className="text-sm text-text-muted">Carriers need these to quote and book from this address. They are saved to your settings.</p>
        {fix.includes('companyName') && (
          <FormField label="Company name" htmlFor="ship-from-fix-company" required error={errors.companyName?.message}>
            <input id="ship-from-fix-company" autoComplete="off" disabled={saving} className={fieldClass(errors.companyName?.message)} {...register('companyName')} />
          </FormField>
        )}
        {fix.includes('companyPhone') && (
          <FormField label="Company phone" htmlFor="ship-from-fix-phone-number" required error={errors.phone?.message as string | undefined}>
            <Controller control={control} name="phone" render={({ field }) => <PhoneField idPrefix="ship-from-fix-phone" value={field.value} onChange={field.onChange} error={errors.phone?.message as string | undefined} disabled={saving} />} />
          </FormField>
        )}
        {fix.includes('postalCode') && (
          <FormField label="Warehouse postal code" htmlFor="ship-from-fix-postal" required error={errors.postalCode?.message}>
            <input id="ship-from-fix-postal" autoComplete="off" disabled={saving} className={fieldClass(errors.postalCode?.message)} {...register('postalCode', { setValueAs: (value: string) => value.toUpperCase() })} />
          </FormField>
        )}
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving} disabled={!ready}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}
