'use client'

import React, { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCitySearch } from '@/components/address-fields/AddressFields'
import { FormField, fieldClass, selectClass } from '@/components/form-field/FormField'
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
  useGetContainerWarehousesQuery,
  type ContainerWarehouse,
  useGetPackablePurchaseOrdersQuery,
  useUpdateContainerMutation,
  type ContainerBody,
  type ContainerField,
  type ContainerItem,
  type ContainerStatus,
  type PackablePurchaseOrder,
  type PoCurrency,
  type PoDestination,
} from '@/services/api/procurement.api'
import { applyServerIssues } from '@/utils/apiErrors'
import { cn } from '@/utils/cn'
import { CONTAINER_STATUS_META, CONTAINER_STATUSES, DESTINATION_LABEL, DESTINATION_OPTIONS, containerLabel, isShipping } from '../shared/poMeta'

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
    status: z.enum(CONTAINER_STATUSES as [ContainerStatus, ...ContainerStatus[]]),
    etd: z.string(),
    eta: z.string(),
    destination: z.enum(['US', 'CA']),
    /** A new container takes its destination country from this purchase order; never sent, only picks the country. */
    purchaseOrderId: z.number().nullable(),
    city: z.custom<GeoCity | null>(),
    portOfArrival: z.string().nullable(),
    /** The day it was shipped on board (yyyy-MM-dd), entered by hand. */
    shippedOnBoardAt: z.string(),
    warehouseId: z.number().nullable(),
    /** Capacity in cubic feet: a number only. */
    cubicFeet: z
      .string()
      .trim()
      .refine((value) => value === '' || Number.isFinite(Number(value.replace(/,/g, ''))), 'Enter a number only')
      .refine((value) => value === '' || Number(value.replace(/,/g, '')) > 0, 'Must be greater than 0')
      .refine((value) => value === '' || Math.abs(Number(value.replace(/,/g, '')) * 100 - Math.round(Number(value.replace(/,/g, '')) * 100)) < 1e-6, 'Use at most 2 decimals'),
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
  shippedOnBoardAt: 'shippedOnBoardAt',
  warehouseId: 'warehouseId',
  cubicFeet: 'cubicFeet',
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
      purchaseOrderId: null,
      city: null,
      portOfArrival: null,
      shippedOnBoardAt: '',
      warehouseId: null,
      cubicFeet: '',
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
    purchaseOrderId: null,
    city: container.destinationCity ? { name: container.destinationCity, provinceCode: container.destinationProvince ?? '' } : null,
    portOfArrival: container.portOfArrival,
    shippedOnBoardAt: day(container.shippedOnBoardAt),
    warehouseId: container.warehouse?.id ?? null,
    cubicFeet: container.cubicFeet === null ? '' : String(container.cubicFeet),
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
 * The total cost is not asked when booking a container (it is unknown then); it is entered later by editing it.
 */
export const ContainerFormModal: React.FC<ContainerFormModalProps> = ({ isOpen, onClose, container, preset, onSaved }) => {
  const { success, failure } = useApiFeedback()
  const [createContainer, { isLoading: creating }] = useCreateContainerMutation()
  const [updateContainer, { isLoading: updating }] = useUpdateContainerMutation()
  const busy = creating || updating

  // A new container is fully editable; a saved one as far as its status allows
  const editable = new Set<ContainerField>(container?.permissions.editableFields ?? (Object.keys(SERVER_FIELDS) as ContainerField[]))
  const locked = (field: ContainerField) => !editable.has(field)
  const askCost = Boolean(container)
  // A new container is booked; a saved one moves as far as the server allows (reaching the warehouse is the delivery)
  const statusOptions: ContainerStatus[] = container ? container.permissions.statuses : ['BOOKED']

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
  const purchaseOrderId = useWatch({ control, name: 'purchaseOrderId' })
  const etd = useWatch({ control, name: 'etd' })
  const cities = useCitySearch(destination)
  const { data: ports = [], isFetching: loadingPorts } = useGetContainerPortsQuery(destination, { skip: !isOpen })
  const { data: warehouses = [], isFetching: loadingWarehouses } = useGetContainerWarehousesQuery(undefined, { skip: !isOpen })

  // A new container's country comes from its purchase order (or the packaging list it was opened from): read-only
  const countryFromOrder = !container && !preset
  const { data: poOptions = [], isFetching: loadingPos } = useGetPackablePurchaseOrdersQuery({}, { skip: !isOpen || !countryFromOrder })
  const countryKnown = !countryFromOrder || purchaseOrderId !== null

  /** Picking the purchase order sets the country (and the currency of it); city and port are then picked for that country. */
  const pickPurchaseOrder = (po: PackablePurchaseOrder) => {
    setValue('purchaseOrderId', po.id, { shouldValidate: true })
    if (po.destination !== destination) {
      setValue('destination', po.destination)
      setValue('currency', po.destination === 'CA' ? 'CAD' : 'USD')
    }
    setValue('city', null)
    setValue('portOfArrival', null)
  }

  /** A container ships to one country: its city and port belong to that country. */
  const changeDestination = (next: PoDestination) => {
    if (next === destination) return
    setValue('destination', next)
    setValue('city', null)
    setValue('portOfArrival', null)
    setValue('currency', next === 'CA' ? 'CAD' : 'USD')
  }

  const submit = handleSubmit(async (values) => {
    if (countryFromOrder && values.purchaseOrderId === null) return setError('purchaseOrderId', { message: 'Pick the purchase order this container carries' })
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
      shippedOnBoardAt: values.shippedOnBoardAt || null,
      warehouseId: values.warehouseId,
      cubicFeet: values.cubicFeet ? Number(values.cubicFeet.replace(/,/g, '')) : null,
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
        {container && isShipping(container.status) && (
          <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
            {CONTAINER_STATUS_META[container.status].label}: only the ETA, the shipped-on-board date and the shipping status can change until it is marked as delivered.
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Container number" htmlFor="ct-number" error={errors.containerNumber?.message} hint="The shipping line's number, e.g. MSKU1234567. Payment requests with this container number show on the container.">
            <input id="ct-number" autoComplete="off" placeholder="e.g. MSKU1234567" className={fieldClass(errors.containerNumber?.message)} disabled={locked('containerNumber')} {...register('containerNumber')} />
          </FormField>
          <FormField label="Status" htmlFor="ct-status" error={errors.status?.message} hint={container ? undefined : 'New containers start as booked'}>
            <div className="relative">
              <select id="ct-status" className={selectClass(errors.status?.message)} disabled={!container?.permissions.canChangeStatus} {...register('status')}>
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

          <FormField label="Shipped on board" htmlFor="ct-board" error={errors.shippedOnBoardAt?.message} hint="The day it was loaded on the vessel; locked once the container is delivered">
            <Controller
              control={control}
              name="shippedOnBoardAt"
              render={({ field }) => <SingleDatePicker id="ct-board" value={field.value} onChange={field.onChange} error={errors.shippedOnBoardAt?.message} disabled={locked('shippedOnBoardAt')} />}
            />
          </FormField>

          {countryFromOrder && (
            <FormField label="Purchase order" htmlFor="ct-po" required error={errors.purchaseOrderId?.message} hint="Its destination sets the country of this container">
              <Controller
                control={control}
                name="purchaseOrderId"
                render={({ field }) => (
                  <SearchableSelect<PackablePurchaseOrder>
                    id="ct-po"
                    value={poOptions.find((po) => po.id === field.value) ?? null}
                    onChange={pickPurchaseOrder}
                    options={poOptions}
                    getKey={(po) => po.id}
                    getLabel={(po) => `${po.poNo} ${po.supplier.name}`}
                    renderOption={(po) => (
                      <span className="flex items-center justify-between gap-3">
                        <span className="font-medium">
                          {po.poNo} <span className="font-normal text-text-secondary">· {po.supplier.name}</span>
                        </span>
                        <span className="text-xs text-text-muted">{DESTINATION_LABEL[po.destination]}</span>
                      </span>
                    )}
                    loading={loadingPos}
                    placeholder="Select the purchase order"
                    searchPlaceholder="PO number or supplier..."
                    emptyText="No purchase order to ship."
                    error={errors.purchaseOrderId?.message}
                  />
                )}
              />
            </FormField>
          )}
          <FormField label="Destination country" error={errors.destination?.message} hint={countryFromOrder ? 'From the purchase order; it cannot be changed here' : preset && !container ? 'The packaging list ships here' : undefined}>
            {countryFromOrder || (Boolean(preset) && !container) ? (
              // Taken from the purchase order (or the packaging list): shown, never typed
              <input readOnly tabIndex={-1} aria-label="Destination country" value={countryKnown ? DESTINATION_LABEL[destination] : ''} placeholder="Set by the purchase order" className={cn(fieldClass(errors.destination?.message), 'cursor-not-allowed bg-secondary-50')} />
            ) : (
              <SegmentedToggle<PoDestination> ariaLabel="Destination country" value={destination} onChange={changeDestination} options={DESTINATION_OPTIONS} disabled={locked('destination')} />
            )}
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
                  disabled={locked('destinationCity') || !countryKnown}
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
                  disabled={locked('portOfArrival') || !countryKnown}
                />
              )}
            />
          </FormField>
          <FormField label="Warehouse" htmlFor="ct-warehouse" error={errors.warehouseId?.message} hint="Where this container is going">
            <Controller
              control={control}
              name="warehouseId"
              render={({ field }) => (
                <SearchableSelect<ContainerWarehouse>
                  id="ct-warehouse"
                  value={warehouses.find((warehouse) => warehouse.id === field.value) ?? null}
                  onChange={(warehouse) => field.onChange(warehouse.id)}
                  options={warehouses}
                  getKey={(warehouse) => warehouse.id}
                  getLabel={(warehouse) => warehouse.name}
                  renderOption={(warehouse) => (
                    <span className="flex min-w-0 flex-col">
                      <span className="break-words font-medium">{warehouse.name}</span>
                      <span className="break-words text-xs text-text-muted">{[warehouse.city, warehouse.province, warehouse.country].filter(Boolean).join(', ')}</span>
                    </span>
                  )}
                  loading={loadingWarehouses}
                  placeholder="Select warehouse"
                  searchPlaceholder="Search warehouses..."
                  emptyText="No warehouses yet. Add them in Settings > Warehouses."
                  error={errors.warehouseId?.message}
                  disabled={locked('warehouseId')}
                />
              )}
            />
          </FormField>
          <FormField label="Cubic feet" htmlFor="ct-cubic" error={errors.cubicFeet?.message} hint="Number only, e.g. 2,350">
            <input id="ct-cubic" inputMode="decimal" autoComplete="off" placeholder="0" className={cn(fieldClass(errors.cubicFeet?.message), 'text-right')} disabled={locked('cubicFeet')} {...register('cubicFeet')} />
          </FormField>
          {askCost && (
            // The total cost is the landed cost its cost analysis works out, not typed here
            <FormField label="Currency" htmlFor="ct-currency" hint="The total cost is the landed cost from the cost analysis">
              <Controller
                control={control}
                name="currency"
                render={({ field }) => <SegmentedToggle<PoCurrency> ariaLabel="Currency" value={field.value} onChange={field.onChange} options={CURRENCIES} disabled={locked('currency')} />}
              />
            </FormField>
          )}
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
