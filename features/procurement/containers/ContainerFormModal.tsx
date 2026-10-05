'use client'

import React, { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCitySearch } from '@/components/address-fields/AddressFields'
import { FormField, fieldClass } from '@/components/form-field/FormField'
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
  useGetPackagingListsQuery,
  useUpdateContainerMutation,
  type ContainerBody,
  type ContainerItem,
  type ContainerStatus,
  type PoCurrency,
  type PoDestination,
} from '@/services/api/procurement.api'
import { applyServerIssues } from '@/utils/apiErrors'
import { useDebounce } from '@/utils/debounce'
import { CONTAINER_STATUS_META, DESTINATION_LABEL } from '../shared/poMeta'

/** A packaging list as the pickers show it. */
export interface ListChoice {
  id: number
  plNo: string
  supplierName: string
  units: number
  cbm: number
}

const STATUSES = (Object.keys(CONTAINER_STATUS_META) as ContainerStatus[]).map((value) => ({ value, label: CONTAINER_STATUS_META[value].label }))
const DESTINATIONS = (['US', 'CA'] as const).map((value) => ({ value, label: DESTINATION_LABEL[value] }))
const CURRENCIES: Array<{ value: PoCurrency; label: string }> = [
  { value: 'USD', label: 'USD' },
  { value: 'CAD', label: 'CAD' },
]

const text = (max: number, label: string) => z.string().trim().max(max, `${label} is at most ${max} characters`)

const schema = z
  .object({
    billOfLading: text(40, 'Bill of lading'),
    masterBillOfLading: text(40, 'Master bill of lading'),
    status: z.enum(['SHIPPED', 'DELIVERED_AT_WAREHOUSE']),
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
    packagingList: z.custom<ListChoice | null>(),
  })
  .superRefine((values, ctx) => {
    if (values.etd && values.eta && values.eta < values.etd) ctx.addIssue({ code: 'custom', path: ['eta'], message: 'ETA must be on or after the ETD' })
  })

type Values = z.infer<typeof schema>

const SERVER_FIELDS: Record<string, keyof Values> = {
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
  packagingListId: 'packagingList',
}

const day = (value: string | null) => (value ? value.slice(0, 10) : '')
const nullable = (value: string) => value.trim() || null

function valuesOf(container: ContainerItem | null | undefined, preset?: { destination: PoDestination; packagingList?: ListChoice | null }): Values {
  if (!container) {
    return {
      billOfLading: '',
      masterBillOfLading: '',
      status: 'SHIPPED',
      etd: '',
      eta: '',
      destination: preset?.destination ?? 'US',
      city: null,
      portOfArrival: null,
      totalCost: '',
      currency: preset?.destination === 'CA' ? 'CAD' : 'USD',
      packagingList: preset?.packagingList ?? null,
    }
  }
  const list = container.packagingList
  return {
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
    packagingList: list ? { id: list.id, plNo: list.plNo, supplierName: list.supplier.name, units: container.totals.units, cbm: container.totals.cbm } : null,
  }
}

interface ContainerFormModalProps {
  isOpen: boolean
  onClose: () => void
  /** The container being edited; a new one otherwise. */
  container?: ContainerItem | null
  /** A new container opened from a packaging list: its country, and the list itself. */
  preset?: { destination: PoDestination; packagingList?: ListChoice | null }
  onSaved?: (container: ContainerItem) => void
}

/** "New container" / "Edit container". The container number is given by the server; totals come from the packaging list. */
export const ContainerFormModal: React.FC<ContainerFormModalProps> = ({ isOpen, onClose, container, preset, onSaved }) => {
  const { success, failure } = useApiFeedback()
  const [createContainer, { isLoading: creating }] = useCreateContainerMutation()
  const [updateContainer, { isLoading: updating }] = useUpdateContainerMutation()
  const busy = creating || updating
  const editing = Boolean(container)

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

  const [listSearch, setListSearch] = useState('')
  const [listsOpen, setListsOpen] = useState(false)
  const debouncedListSearch = useDebounce(listSearch.trim(), 250)
  const { data: lists, isFetching: loadingLists } = useGetPackagingListsQuery(
    { page: 1, limit: 50, container: 'NONE', destination, search: debouncedListSearch },
    { skip: !isOpen || !listsOpen }
  )
  const listChoices: ListChoice[] = (lists?.data ?? []).map((list) => ({ id: list.id, plNo: list.plNo, supplierName: list.supplier.name, units: list.units, cbm: list.cbm }))

  /** A container ships to one country: its city, port and list belong to that country. */
  const changeDestination = (next: PoDestination) => {
    if (next === destination) return
    setValue('destination', next)
    setValue('city', null)
    setValue('portOfArrival', null)
    setValue('packagingList', null)
    setValue('currency', next === 'CA' ? 'CAD' : 'USD')
  }

  const submit = handleSubmit(async (values) => {
    const body: ContainerBody = {
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
      packagingListId: values.packagingList?.id ?? null,
      ...(container ? { expectedUpdatedAt: container.updatedAt } : {}),
    }
    try {
      const saved = container ? await updateContainer({ id: container.id, body }).unwrap() : await createContainer(body).unwrap()
      success(container ? `${saved.containerNo} saved` : `${saved.containerNo} created${saved.packagingList ? ` with ${saved.packagingList.plNo}` : ''}`)
      onSaved?.(saved)
      onClose()
    } catch (error) {
      const placed = applyServerIssues(error, (field, issue, options) => setError(SERVER_FIELDS[field], issue, options), (field) => field in SERVER_FIELDS)
      if (!placed) failure(error, container ? 'Could not save the container' : 'Could not create the container')
    }
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={container ? `Edit ${container.containerNo}` : 'New container'} size="xl" closeOnEscape={!busy} className="sm:overflow-visible">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Bill of lading" htmlFor="ct-bol" error={errors.billOfLading?.message}>
            <input id="ct-bol" autoComplete="off" placeholder="Bill of lading #" className={fieldClass(errors.billOfLading?.message)} {...register('billOfLading')} />
          </FormField>
          <FormField label="Master bill of lading" htmlFor="ct-mbl" error={errors.masterBillOfLading?.message}>
            <input id="ct-mbl" autoComplete="off" placeholder="Master BOL #" className={fieldClass(errors.masterBillOfLading?.message)} {...register('masterBillOfLading')} />
          </FormField>

          <FormField label="ETD" htmlFor="ct-etd" error={errors.etd?.message}>
            <Controller control={control} name="etd" render={({ field }) => <SingleDatePicker id="ct-etd" value={field.value} onChange={field.onChange} error={errors.etd?.message} />} />
          </FormField>
          <FormField label="ETA" htmlFor="ct-eta" error={errors.eta?.message}>
            <Controller
              control={control}
              name="eta"
              render={({ field }) => <SingleDatePicker id="ct-eta" value={field.value} onChange={field.onChange} min={etd || undefined} error={errors.eta?.message} />}
            />
          </FormField>

          <FormField label="Status" error={errors.status?.message}>
            <Controller control={control} name="status" render={({ field }) => <SegmentedToggle<ContainerStatus> ariaLabel="Status" value={field.value} onChange={field.onChange} options={STATUSES} />} />
          </FormField>
          <FormField label="Destination country" error={errors.destination?.message} hint={preset && !editing ? 'The packaging list ships here' : undefined}>
            <SegmentedToggle<PoDestination> ariaLabel="Destination country" value={destination} onChange={changeDestination} options={DESTINATIONS} disabled={Boolean(preset) && !editing} />
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
                />
              )}
            />
          </FormField>

          <FormField label="Total cost" htmlFor="ct-cost" error={errors.totalCost?.message}>
            <div className="flex gap-2">
              <input id="ct-cost" inputMode="decimal" autoComplete="off" placeholder="0.00" className={fieldClass(errors.totalCost?.message)} {...register('totalCost')} />
              <Controller control={control} name="currency" render={({ field }) => <SegmentedToggle<PoCurrency> ariaLabel="Currency" value={field.value} onChange={field.onChange} options={CURRENCIES} />} />
            </div>
          </FormField>
          <FormField label="Packaging list (optional)" htmlFor="ct-list" error={errors.packagingList?.message} hint={`Only lists shipping to ${DESTINATION_LABEL[destination]} that are not in a container`}>
            <Controller
              control={control}
              name="packagingList"
              render={({ field }) => (
                <SearchableSelect<ListChoice>
                  id="ct-list"
                  value={field.value}
                  onChange={field.onChange}
                  options={field.value && !listChoices.some((choice) => choice.id === field.value!.id) ? [field.value, ...listChoices] : listChoices}
                  getKey={(choice) => choice.id}
                  getLabel={(choice) => `${choice.plNo} · ${choice.supplierName}`}
                  renderOption={(choice) => (
                    <span className="flex w-full justify-between gap-3">
                      <span className="font-mono text-sm font-semibold">{choice.plNo}</span>
                      <span className="truncate text-xs text-text-muted">
                        {choice.supplierName} · {choice.units.toLocaleString('en-CA')} units · {choice.cbm.toFixed(2)} CBM
                      </span>
                    </span>
                  )}
                  search={listSearch}
                  onSearchChange={setListSearch}
                  onOpenChange={setListsOpen}
                  loading={loadingLists}
                  placeholder="Select one unassigned packaging list"
                  searchPlaceholder="PL #, supplier, PO # or SKU"
                  emptyText="No packaging list is waiting for a container."
                  error={errors.packagingList?.message}
                  footer={(close) =>
                    field.value ? (
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm text-text-muted hover:bg-secondary-50"
                        onClick={() => {
                          field.onChange(null)
                          close()
                        }}
                      >
                        No packaging list yet
                      </button>
                    ) : null
                  }
                />
              )}
            />
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
