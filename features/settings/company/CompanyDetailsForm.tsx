'use client'

import React, { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormField } from '@/components/form-field/FormField'
import { EMPTY_PHONE, fromInternational, isValidPhone, PhoneField, toInternational, type PhoneValue } from '@/components/phone-field/PhoneField'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/design-system/cards'
import { Input, Textarea } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useGetCompanyDetailsQuery, useUpdateCompanyDetailsMutation, type CompanyDetails } from '@/services/api/companyDetails.api'

/** Same rules as the server. */
const schema = z.object({
  name: z.string().trim().min(1, 'Company name is required').max(120, 'Company name is too long'),
  address: z.string().trim().max(500, 'Address is too long'),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email').max(160)]),
  /** Optional; once digits are typed they must make a real number for the picked country. */
  phone: z.custom<PhoneValue>().refine((phone) => !phone.number || isValidPhone(phone), 'Enter a valid phone number for this country'),
})

type Values = z.infer<typeof schema>

const EMPTY: Values = { name: '', address: '', email: '', phone: EMPTY_PHONE }

const toValues = (details: CompanyDetails): Values => ({ ...details, phone: fromInternational(details.phone, details.phoneCountry) })

const toBody = ({ phone, ...values }: Values): CompanyDetails => ({ ...values, phoneCountry: phone.number ? phone.country : '', phone: toInternational(phone) })

/** Settings > Company: the name, address and contact printed as the letterhead on purchase order PDFs. */
export const CompanyDetailsForm: React.FC = () => {
  const ability = useAppAbility()
  const canEdit = ability.can('write', 'settings:company')
  const { success, failure } = useApiFeedback()
  const { data, isLoading, isError } = useGetCompanyDetailsQuery()
  const [save, { isLoading: saving }] = useUpdateCompanyDetailsMutation()
  const { register, handleSubmit, reset, control, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY })
  const { errors, isDirty } = formState

  useEffect(() => {
    if (data) reset(toValues(data))
  }, [data, reset])

  const submit = handleSubmit(async (values) => {
    try {
      reset(toValues(await save(toBody(values)).unwrap()))
      success('Company details saved')
    } catch (error) {
      failure(error, 'Could not save the company details')
    }
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    )
  }
  if (isError) return <p className="py-16 text-center text-sm text-danger-600">Could not load the company details.</p>

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company details</CardTitle>
        <CardDescription>Printed as the letterhead on purchase order PDFs. Changes apply to the next PDF you download.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} noValidate className="space-y-4">
          <Input label="Company name" placeholder="Beddora Inc." error={errors.name?.message} disabled={!canEdit} {...register('name')} />
          <Textarea
            label="Address"
            rows={3}
            placeholder={'1200 Bay Street, Suite 400\nToronto, ON M5R 2A5, Canada'}
            helperText="One line per row, as it should print."
            error={errors.address?.message}
            disabled={!canEdit}
            {...register('address')}
          />
          <div className="grid gap-4">
            <Input label="Email" type="email" placeholder="purchasing@beddora.ca" error={errors.email?.message} disabled={!canEdit} {...register('email')} />
            <FormField label="Phone" htmlFor="company-phone-number" error={errors.phone?.message as string | undefined}>
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <PhoneField idPrefix="company-phone" value={field.value} onChange={field.onChange} error={errors.phone?.message as string | undefined} disabled={!canEdit} />
                )}
              />
            </FormField>
          </div>
          {canEdit && (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={!isDirty || saving} onClick={() => data && reset(toValues(data))}>
                Discard changes
              </Button>
              <Button type="submit" isLoading={saving} disabled={!isDirty}>
                Save
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
