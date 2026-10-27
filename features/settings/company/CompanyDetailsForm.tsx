'use client'

import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/design-system/cards'
import { Input, Textarea } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useGetCompanyDetailsQuery, useUpdateCompanyDetailsMutation } from '@/services/api/companyDetails.api'

/** Same rules as the server. */
const schema = z.object({
  name: z.string().trim().min(1, 'Company name is required').max(120, 'Company name is too long'),
  address: z.string().trim().max(500, 'Address is too long'),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email').max(160)]),
  phone: z.string().trim().max(40, 'Phone is too long'),
})

type Values = z.infer<typeof schema>

const EMPTY: Values = { name: '', address: '', email: '', phone: '' }

/** Settings > Company: the name, address and contact printed as the letterhead on purchase order PDFs. */
export const CompanyDetailsForm: React.FC = () => {
  const ability = useAppAbility()
  const canEdit = ability.can('write', 'settings:company')
  const { success, failure } = useApiFeedback()
  const { data, isLoading, isError } = useGetCompanyDetailsQuery()
  const [save, { isLoading: saving }] = useUpdateCompanyDetailsMutation()
  const { register, handleSubmit, reset, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: EMPTY })
  const { errors, isDirty } = formState

  useEffect(() => {
    if (data) reset(data)
  }, [data, reset])

  const submit = handleSubmit(async (values) => {
    try {
      reset(await save(values).unwrap())
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
    <Card className="max-w-2xl">
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Email" type="email" placeholder="purchasing@beddora.ca" error={errors.email?.message} disabled={!canEdit} {...register('email')} />
            <Input label="Phone" type="tel" placeholder="+1 416 555 0100" error={errors.phone?.message} disabled={!canEdit} {...register('phone')} />
          </div>
          {canEdit && (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" disabled={!isDirty || saving} onClick={() => data && reset(data)}>
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
