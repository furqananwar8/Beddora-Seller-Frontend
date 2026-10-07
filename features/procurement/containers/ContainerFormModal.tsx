'use client'

import React, { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCitySearch } from '@/components/address-fields/AddressFields'
import { FormField, fieldClass, selectClass } from '@/components/form-field/FormField'
import { NumericInput } from '@/components/form-field/NumericInput'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { SingleDatePicker } from '@/components/single-date-picker/SingleDatePicker'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import type { GeoCity } from '@/services/api/geo.api'
import {
  useCreateContainerMutation,
  useGetContainerPortsQuery,
  useUpdateContainerMutation,
  type ContainerBody,
  type ContainerField,
  type ContainerItem,
  type ContainerStatus,
  type PoCurrency,
  type PoDestination,
} from '@/services/api/procurement.api'
import { applyServerIssues } from '@/utils/apiErrors'
import { CONTAINER_STATUS_META, CONTAINER_STATUSES, DESTINATION_LABEL, containerLabel, nextContainerStatuses } from '../shared/poMeta'

const DESTINATIONS = (['US', 'CA'] as const).map((value) => ({ value, label: DESTINATION_LABEL[value] }))
const CURRENCIES: Array<{ value: PoCurrency; label: string }> = [
  { value: 'USD', label: 'USD' },
  { value: 'CAD', label: 'CAD' },
]

const text = (max: number, label: string) => z.string().trim().max(max, `${label} is at most ${max} characters`)

const schema = z
  .object({
    containerNumber: z
      .string()
      .trim()
      .max(20, 'Container number is at most 20 characters')
      .refine((value) => value === '' || /^[A-Za-z0-9\s-]+$/.test(value), 'Use letters and digits only'),
    billOfLading: text(40, 'Bill of lading'),
    masterBillOfLading: text(40, 'Master bill of lading'),
    status: z.enum(['BOOKED', 'IN_TRANSIT', 'DELIVERED']),
    etd: z.string(),
    eta: z.string(),
    destination: z.enum(['US', 'CA']),
    city: z.custom<GeoCity | null>(),
    portOfArrival: z.string().nullable(),
    totalCost: z
      .string()
      .trim()
      .refine((value) => value === '' || (/^\d+(\.\d{1,2})?$/.test(value) && Number(value) <= 999_999_999), 'Enter an amount with at most 2 decimals'),
    currency: z.enum(['USD', 'CAD']),
  })
  .superRefine((values, ctx) => {
    if (values.etd && values.eta && values.eta < values.etd) ctx.addIssue({ code: 'custom', path: ['eta'], message: 'ETA must be on or after the ETD' })
  })

type Values = z.infer<typeof schema>

const SERVER_FIELDS: Record<string, keyof Values> = {
  containerNumber: 'containerNumber',
  billOfLading: 'billOfLading',
  masterBillOfLading: 'masterBillOfLading',
  status: 'status',
  etd: 'etd',
  eta: 'eta',
  destination: 'destination',
  destinationCity: 'city',
  destinationProvince: 'city',
  portOfArrival: 'portOfArrival',
  totalCost: 'totalCost',
  currency: 'currency',
}

const day = (value: string | null) => (value ? value.slice(0, 10) : '')
const nullable = (value: string) => value.trim() || null

function valuesOf(container: ContainerItem | null | undefined, preset?: { destination: PoDestination }): Values {
  if (!container) {
    return {
      containerNumber: '',
      billOfLading: '',
      masterBillOfLading: '',
      status: 'BOOKED',
      etd: '',
      eta: '',
      destination: preset?.destination ?? 'US',
      city: null,
      portOfArrival: null,
      totalCost: '',
      currency: preset?.destination === 'CA' ? 'CAD' : 'USD',
    }
  }
  return {
    containerNumber: container.containerNumber ?? '',
    billOfLading: container.billOfLading ?? '',
    masterBillOfLading: container.masterBillOfLading ?? '',
    status: container.status,
    etd: day(container.etd),
    eta: day(container.eta),
    destination: container.destination,
    city: container.destinationCity ? { name: container.destinationCity, provinceCode: container.destinationProvince ?? '' } : null,
    portOfArrival: container.portOfArrival,
    totalCost: container.totalCost === null ? '' : String(container.totalCost),
    currency: container.currency,
  }
}

interface ContainerFormModalProps {
  isOpen: boolean
  onClose: () => void
  /** The container being edited; a new one otherwise. */
  container?: ContainerItem | null
  /** A new container opened from a packaging list ships to that list's country. */
  preset?: { destination: PoDestination }
  onSaved?: (container: ContainerItem) => void
}

/**
 * "New container" / "Edit container". The packaging list is put in separately (from the list, or the container's
 * page). What can change depends on the status: everything while booked, only the ETA in transit, nothing delivered.
 */
export const ContainerFormModal: React.FC<ContainerFormModalProps> = ({ isOpen, onClose, container, preset, onSaved }) => {
  const { success, failure } = useApiFeedback()
  const [createContainer, { isLoading: creating }] = useCreateContainerMutation()
  const [updateContainer, { isLoading: updating }] = useUpdateContainerMutation()
  const busy = creating || updating

  // A new container is fully editable; a saved one as far as its status allows
  const editable = new Set<ContainerField>(container?.permissions.editableFields ?? (Object.keys(SERVER_FIELDS) as ContainerField[]))
  const locked = (field: ContainerField) => !editable.has(field)
  const statusOptions = container ? nextContainerStatuses(container.status) : CONTAINER_STATUSES.filter((status) => status !== 'DELIVERED')

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: valuesOf(container, preset) })

  // A fresh form every time it opens (another row, or the same row saved elsewhere since)
  useEffect(() => {
    if (isOpen) reset(valuesOf(container, preset))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, container?.id])

  const destination = useWatch({ control, name: 'destination' })
  const etd = useWatch({ control, name: 'etd' })
  const cities = useCitySearch(destination)
  const { data: ports = [], isFetching: loadingPorts } = useGetContainerPortsQuery(destination, { skip: !isOpen })

  /** A container ships to one country: its city and port belong to that country. */
  const changeDestination = (next: PoDestination) => {
    if (next === destination) return
    setValue('destination', next)
    setValue('city', null)
    setValue('portOfArrival', null)
    setValue('currency', next === 'CA' ? 'CAD' : 'USD')
  }

  const submit = handleSubmit(async (values) => {
    const body: ContainerBody = {
      containerNumber: nullable(values.containerNumber.replace(/\s+/g, '').toUpperCase()),
      billOfLading: nullable(values.billOfLading),
      masterBillOfLading: nullable(values.masterBillOfLading),
      status: values.status,
      etd: values.etd || null,
      eta: values.eta || null,
      destination: values.destination,
      destinationCity: values.city?.name ?? null,
      destinationProvince: values.city?.provinceCode || null,
      portOfArrival: values.portOfArrival,
      totalCost: values.totalCost === '' ? null : Number(values.totalCost),
      currency: values.currency,
      ...(container ? { expectedUpdatedAt: container.updatedAt } : {}),
    }
    try {
      const saved = container ? await updateContainer({ id: container.id, body }).unwrap() : await createContainer(body).unwrap()
      success(container ? `${containerLabel(saved)} saved` : `${containerLabel(saved)} created`)
      onSaved?.(saved)
      onClose()
    } catch (error) {
      const placed = applyServerIssues(error, (field, issue, options) => setError(SERVER_FIELDS[field], issue, options), (field) => field in SERVER_FIELDS)
      if (!placed) failure(error, container ? 'Could not save the container' : 'Could not create the container')
    }
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={container ? `Edit ${containerLabel(container)}` : 'New container'} size="xl" closeOnEscape={!busy} className="sm:overflow-visible">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {container?.status === 'IN_TRANSIT' && (
          <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">In transit: only the ETA and the status can change until it is delivered.</p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Container number" htmlFor="ct-number" error={errors.containerNumber?.message} hint="The shipping line's number, e.g. MSKU1234567. Payment requests with this container number show on the container.">
            <input id="ct-number" autoComplete="off" placeholder="e.g. MSKU1234567" className={fieldClass(errors.containerNumber?.message)} disabled={locked('containerNumber')} {...register('containerNumber')} />
          </FormField>
          <FormField label="Status" htmlFor="ct-status" error={errors.status?.message} hint={container ? undefined : 'New containers start as booked'}>
            <div className="relative">
              <select id="ct-status" className={selectClass(errors.status?.message)} disabled={Boolean(container) && !container!.permissions.canChangeStatus} {...register('status')}>
                {statusOptions.map((status: ContainerStatus) => (
                  <option key={status} value={status}>
                    {CONTAINER_STATUS_META[status].label}
                  </option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </FormField>

          <FormField label="Bill of lading" htmlFor="ct-bol" error={errors.billOfLading?.message}>
            <input id="ct-bol" autoComplete="off" placeholder="Bill of lading #" className={fieldClass(errors.billOfLading?.message)} disabled={locked('billOfLading')} {...register('billOfLading')} />
          </FormField>
          <FormField label="Master bill of lading" htmlFor="ct-mbl" error={errors.masterBillOfLading?.message}>
            <input id="ct-mbl" autoComplete="off" placeholder="Master BOL #" className={fieldClass(errors.masterBillOfLading?.message)} disabled={locked('masterBillOfLading')} {...register('masterBillOfLading')} />
          </FormField>

          <FormField label="ETD" htmlFor="ct-etd" error={errors.etd?.message}>
            <Controller control={control} name="etd" render={({ field }) => <SingleDatePicker id="ct-etd" value={field.value} onChange={field.onChange} error={errors.etd?.message} disabled={locked('etd')} />} />
          </FormField>
          <FormField label="ETA" htmlFor="ct-eta" error={errors.eta?.message}>
            <Controller
              control={control}
              name="eta"
              render={({ field }) => <SingleDatePicker id="ct-eta" value={field.value} onChange={field.onChange} min={etd || undefined} error={errors.eta?.message} disabled={locked('eta')} />}
            />
          </FormField>

          <FormField label="Destination country" error={errors.destination?.message} hint={preset && !container ? 'The packaging list ships here' : undefined}>
            <SegmentedToggle<PoDestination> ariaLabel="Destination country" value={destination} onChange={changeDestination} options={DESTINATIONS} disabled={(Boolean(preset) && !container) || locked('destination')} />
          </FormField>
          <FormField label="Destination city" htmlFor="ct-city" error={errors.city?.message}>
            <Controller
              control={control}
              name="city"
              render={({ field }) => (
                <SearchableSelect<GeoCity>
                  id="ct-city"
                  value={field.value}
                  onChange={field.onChange}
                  options={cities.cities}
                  getKey={(city) => `${city.provinceCode}:${city.name}`}
                  getLabel={(city) => (city.provinceCode ? `${city.name}, ${city.provinceCode}` : city.name)}
                  search={cities.search}
                  onSearchChange={cities.setSearch}
                  onOpenChange={cities.setOpen}
                  loading={cities.isFetching}
                  placeholder={destination === 'US' ? 'Select a USA city' : 'Select a Canadian city'}
                  searchPlaceholder="Search cities..."
                  emptyText="No city by that name here."
                  error={errors.city?.message}
                  disabled={locked('destinationCity')}
                />
              )}
            />
          </FormField>

          <FormField label="Port of arrival" htmlFor="ct-port" error={errors.portOfArrival?.message}>
            <Controller
              control={control}
              name="portOfArrival"
              render={({ field }) => (
                <SearchableSelect<string>
                  id="ct-port"
                  value={field.value}
                  onChange={field.onChange}
                  options={ports}
                  getKey={(port) => port}
                  getLabel={(port) => port}
                  loading={loadingPorts}
                  placeholder="Select port"
                  searchPlaceholder="Search ports..."
                  error={errors.portOfArrival?.message}
                  disabled={locked('portOfArrival')}
                />
              )}
            />
          </FormField>
          <FormField label="Total cost" htmlFor="ct-cost" error={errors.totalCost?.message}>
            <div className="flex gap-2">
              <NumericInput decimal id="ct-cost" autoComplete="off" placeholder="0.00" className={fieldClass(errors.totalCost?.message)} disabled={locked('totalCost')} {...register('totalCost')} />
              <Controller
                control={control}
                name="currency"
                render={({ field }) => <SegmentedToggle<PoCurrency> ariaLabel="Currency" value={field.value} onChange={field.onChange} options={CURRENCIES} disabled={locked('currency')} />}
              />
            </div>
          </FormField>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" isLoading={busy}>
            {container ? 'Save container' : 'Create container'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
