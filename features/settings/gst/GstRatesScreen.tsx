'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { FormField } from '@/components/form-field/FormField'
import { Button } from '@/design-system/buttons'
import { Input } from '@/design-system/inputs'
import { Spinner } from '@/design-system/loaders'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useCreateGstRateMutation, useDeleteGstRateMutation, useGetGstRateSettingsQuery, type GstRateSetting } from '@/services/api/finance.api'
import { applyServerIssues } from '@/utils/apiErrors'
import { gstRateSchema, type GstRateValues } from './gstRateSchema'

/** Settings > GST: the percentages a payment request can pick from. */
export const GstRatesScreen: React.FC = () => {
  const canEdit = useAppAbility().can('write', 'settings:gst')
  const { success, failure } = useApiFeedback()
  const { data: rates = [], isLoading, isError } = useGetGstRateSettingsQuery()
  const [create, { isLoading: creating }] = useCreateGstRateMutation()
  const [remove, { isLoading: removing }] = useDeleteGstRateMutation()
  const [deleting, setDeleting] = useState<GstRateSetting | null>(null)
  const { register, handleSubmit, reset, setError, formState } = useForm<GstRateValues>({ resolver: zodResolver(gstRateSchema), defaultValues: { name: '', rate: '' } })

  const add = handleSubmit(async ({ name, rate }) => {
    try {
      await create({ name, rate: Number(rate) }).unwrap()
      success(`${name} (${Number(rate)}%) added`)
      reset()
    } catch (error) {
      if (!applyServerIssues(error, setError, ['name', 'rate'])) failure(error, 'Could not add the GST rate')
    }
  })

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await remove(deleting.id).unwrap()
      success(`${deleting.name} removed`)
      setDeleting(null)
    } catch (error) {
      failure(error, 'Could not remove the GST rate')
      setDeleting(null)
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      {canEdit && (
        <form noValidate onSubmit={add} className="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-surface p-4 shadow-sm">
          <FormField label="Name" htmlFor="gst-name" required error={formState.errors.name?.message} className="w-56">
            <Input id="gst-name" placeholder="e.g. GST" className="rounded-lg" {...register('name')} />
          </FormField>
          <FormField label="GST %" htmlFor="gst-rate" required error={formState.errors.rate?.message} className="w-40">
            <Input id="gst-rate" inputMode="decimal" placeholder="e.g. 5" className="rounded-lg" {...register('rate')} />
          </FormField>
          <Button type="submit" size="field" className="mt-6" isLoading={creating}>
            Add rate
          </Button>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : isError ? (
          <p className="py-10 text-center font-medium text-danger-600">Could not load the GST rates.</p>
        ) : rates.length === 0 ? (
          <p className="py-10 text-center text-text-muted">No GST rates yet. Add the percentages payment requests can use.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rates.map((rate) => (
              <li key={rate.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0 flex-1 truncate font-medium text-text-primary" title={rate.name}>
                  {rate.name} <span className="font-normal text-text-muted">· {rate.rate}%</span>
                </span>
                <span className="text-xs text-text-muted">{rate.usedBy > 0 ? `Used by ${rate.usedBy} request${rate.usedBy === 1 ? '' : 's'}` : 'Not used yet'}</span>
                {canEdit && (
                  <Button type="button" variant="outline" size="sm" disabled={rate.usedBy > 0} title={rate.usedBy > 0 ? 'Used by payment requests, so it stays' : undefined} onClick={() => setDeleting(rate)}>
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog isOpen={deleting !== null} title="Remove GST rate" confirmLabel="Remove" busy={removing} onClose={() => setDeleting(null)} onConfirm={confirmDelete}>
        Remove {deleting?.name} ({deleting?.rate}%) from the list? Payment requests can no longer pick it.
      </ConfirmDialog>
    </div>
  )
}
