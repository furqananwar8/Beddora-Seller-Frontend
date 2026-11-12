'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormField } from '@/components/form-field/FormField'
import { Button } from '@/design-system/buttons'
import { Input } from '@/design-system/inputs'
import { Modal } from '@/design-system/modals'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useCreateGstRateMutation, type GstRateSetting } from '@/services/api/finance.api'
import { applyServerIssues } from '@/utils/apiErrors'
import { gstRateSchema, type GstRateValues } from './gstRateSchema'

interface AddGstRateModalProps {
  isOpen: boolean
  onClose: () => void
  /** The rate just added, so the form that opened this can pick it. */
  onAdded?: (rate: GstRateSetting) => void
}

/** Adds a GST percentage without leaving the screen that needs one (same rules and endpoint as Settings > GST). */
export const AddGstRateModal: React.FC<AddGstRateModalProps> = ({ isOpen, onClose, onAdded }) => {
  const { success, failure } = useApiFeedback()
  const [create, { isLoading }] = useCreateGstRateMutation()
  const { register, handleSubmit, reset, setError, formState } = useForm<GstRateValues>({ resolver: zodResolver(gstRateSchema), defaultValues: { name: '', rate: '' } })

  const close = () => {
    reset()
    onClose()
  }

  // Not the page's own form: this one sits inside another, so it must not submit that one
  const add = (event: React.FormEvent) => {
    event.stopPropagation()
    return handleSubmit(async ({ name, rate }) => {
      try {
        const created = await create({ name, rate: Number(rate) }).unwrap()
        success(`${created.name} (${created.rate}%) added`)
        onAdded?.(created)
        close()
      } catch (error) {
        if (!applyServerIssues(error, setError, ['name', 'rate'])) failure(error, 'Could not add the GST rate')
      }
    })(event)
  }

  return (
    <Modal isOpen={isOpen} onClose={close} title="Add GST rate" size="sm">
      <form noValidate onSubmit={add} className="space-y-4">
        <FormField label="Name" htmlFor="new-gst-name" required error={formState.errors.name?.message} hint="For Settings > GST, e.g. GST or HST Ontario">
          <Input id="new-gst-name" placeholder="e.g. GST" autoFocus className="rounded-lg" {...register('name')} />
        </FormField>
        <FormField label="GST %" htmlFor="new-gst-rate" required error={formState.errors.rate?.message} hint="Requests show only the percentage">
          <Input id="new-gst-rate" inputMode="decimal" placeholder="e.g. 5" className="rounded-lg" {...register('rate')} />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Add rate
          </Button>
        </div>
      </form>
    </Modal>
  )
}
