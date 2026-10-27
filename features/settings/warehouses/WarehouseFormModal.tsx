'use client'

import React, { useEffect, useState } from 'react'
import { z } from 'zod'
import { AddressFields, type AddressErrors, type AddressValue } from '@/components/address-fields/AddressFields'
import { FormField, fieldClass } from '@/components/form-field/FormField'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { useCreateWarehouseMutation, useUpdateWarehouseMutation, type Warehouse, type WarehouseBody } from '@/services/api/warehouses.api'
import { apiErrorMessage } from '@/hooks/useApiFeedback'
import { serverIssues } from '@/utils/apiErrors'

interface Values extends AddressValue {
  name: string
  address: string
}

type Errors = Partial<Record<keyof Values, string>>

const EMPTY: Values = { name: '', address: '', country: '', province: '', city: '', postalCode: '' }

/** Same rules as the server, which also checks that the state belongs to the country and the city to the state. */
const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  address: z.string().trim().min(1, 'Address is required').max(300, 'Address is too long'),
  country: z.string().min(1, 'Pick a country'),
  province: z.string(),
  city: z.string().trim().min(1, 'Pick a city'),
  postalCode: z.string().trim().max(12, 'Postal code is too long'),
})

const valuesOf = (warehouse: Warehouse | null): Values =>
  warehouse
    ? { name: warehouse.name, address: warehouse.address, country: warehouse.country, province: warehouse.province ?? '', city: warehouse.city, postalCode: warehouse.postalCode ?? '' }
    : EMPTY

const toBody = (values: Values): WarehouseBody => ({
  name: values.name.trim(),
  address: values.address.trim(),
  country: values.country,
  province: values.province || null,
  city: values.city.trim(),
  postalCode: values.postalCode.trim() || null,
})

const toErrors = (issues: Array<{ field: string; message: string }>): Errors => Object.fromEntries(issues.map((issue) => [issue.field, issue.message]))

interface WarehouseFormModalProps {
  /** null while closed; 'new' to add one. */
  editing: Warehouse | 'new' | null
  onClose: () => void
  onSaved: (warehouse: Warehouse, created: boolean) => void
}

/** Add or edit a warehouse: its name and street, then country → state → city, each list following the one above. */
export const WarehouseFormModal: React.FC<WarehouseFormModalProps> = ({ editing, onClose, onSaved }) => {
  const [values, setValues] = useState<Values>(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [create, { isLoading: creating }] = useCreateWarehouseMutation()
  const [update, { isLoading: updating }] = useUpdateWarehouseMutation()
  const saving = creating || updating
  const isNew = editing === 'new'

  useEffect(() => {
    if (editing === null) return
    setValues(valuesOf(editing === 'new' ? null : editing))
    setErrors({})
    setFormError(null)
  }, [editing])

  const change = (next: Partial<Values>) => {
    setValues((current) => ({ ...current, ...next }))
    // A field that changed stops showing its old message
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([field]) => !(field in next) || next[field as keyof Values] === values[field as keyof Values])))
  }

  const save = async () => {
    const checked = schema.safeParse(values)
    if (!checked.success) return setErrors(toErrors(checked.error.issues.map((issue) => ({ field: String(issue.path[0]), message: issue.message }))))
    setFormError(null)
    try {
      const body = toBody(values)
      const saved = isNew ? await create(body).unwrap() : await update({ id: (editing as Warehouse).id, body }).unwrap()
      onSaved(saved, isNew)
    } catch (error) {
      const issues = serverIssues(error)
      if (issues.length) setErrors(toErrors(issues))
      else setFormError(apiErrorMessage(error, 'Could not save the warehouse'))
    }
  }

  return (
    <Modal isOpen={editing !== null} onClose={saving ? () => undefined : onClose} title={isNew ? 'Add warehouse' : 'Edit warehouse'} size="lg">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Name" htmlFor="warehouse-form-name" required error={errors.name} className="sm:col-span-2">
          <input
            id="warehouse-form-name"
            value={values.name}
            onChange={(event) => change({ name: event.target.value })}
            placeholder="Toronto main warehouse"
            className={fieldClass(errors.name)}
            disabled={saving}
          />
        </FormField>
        <FormField label="Address" htmlFor="warehouse-form-address" required error={errors.address} className="sm:col-span-2">
          <input
            id="warehouse-form-address"
            value={values.address}
            onChange={(event) => change({ address: event.target.value })}
            placeholder="1200 Bay Street, Unit 4"
            className={fieldClass(errors.address)}
            disabled={saving}
          />
        </FormField>
        <AddressFields
          idPrefix="warehouse-form"
          value={values}
          onChange={(next) => change({ country: next.country, province: next.province, city: next.city, postalCode: next.postalCode })}
          errors={errors as AddressErrors}
          disabled={saving}
        />
      </div>
      {formError && (
        <p role="alert" className="mt-4 rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {formError}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={() => void save()} isLoading={saving}>
          {isNew ? 'Add warehouse' : 'Save changes'}
        </Button>
      </div>
    </Modal>
  )
}
