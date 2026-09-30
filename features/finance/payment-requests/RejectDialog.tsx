'use client'

import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { Textarea } from '@/design-system/inputs'
import { FormField } from '../shared/FormField'
import { RejectFormValues, rejectSchema } from './schema'

interface RejectDialogProps {
  /** Request being rejected; null keeps the dialog closed. */
  requestId: number | null
  submitting: boolean
  onConfirm: (id: number, reason: string) => Promise<boolean>
  onClose: () => void
}

export const RejectDialog: React.FC<RejectDialogProps> = ({ requestId, submitting, onConfirm, onClose }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectFormValues>({ resolver: zodResolver(rejectSchema), defaultValues: { reason: '' } })

  useEffect(() => {
    if (requestId !== null) reset({ reason: '' })
  }, [requestId, reset])

  if (requestId === null) return null

  const submit = handleSubmit(async ({ reason }) => {
    if (await onConfirm(requestId, reason)) onClose()
  })

  return (
    <Modal isOpen onClose={onClose} size="sm">
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Reject Payment#{requestId}?</h2>
          <p className="mt-1 text-sm text-text-muted">The requester will be notified with your reason.</p>
        </div>
        <FormField label="Reason" htmlFor="reject-reason" required error={errors.reason?.message}>
          <Textarea id="reject-reason" rows={3} className="rounded-lg" autoFocus placeholder="What needs to change?" {...register('reason')} />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" size="sm" isLoading={submitting}>
            Reject request
          </Button>
        </div>
      </form>
    </Modal>
  )
}
