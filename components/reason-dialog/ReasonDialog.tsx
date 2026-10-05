'use client'

import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormField } from '@/components/form-field/FormField'
import { Button } from '@/design-system/buttons'
import { Textarea } from '@/design-system/inputs'
import { Modal } from '@/design-system/modals'

interface ReasonDialogProps {
  isOpen: boolean
  title: string
  description?: string
  confirmLabel: string
  placeholder?: string
  /** Shortest acceptable reason; the server enforces its own minimum too. */
  minLength?: number
  maxLength?: number
  submitting: boolean
  /** Resolves true when the action went through, which closes the dialog. */
  onConfirm: (reason: string) => Promise<boolean>
  onClose: () => void
}

/** Asks for a required reason before a rejecting action (payment request, purchase order, ...). */
export const ReasonDialog: React.FC<ReasonDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel,
  placeholder = 'What needs to change?',
  minLength = 1,
  maxLength = 500,
  submitting,
  onConfirm,
  onClose,
}) => {
  const schema = z.object({
    reason: z
      .string()
      .trim()
      .min(minLength, 'A reason is required')
      .max(maxLength, `Keep it under ${maxLength} characters`),
  })
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ reason: string }>({ resolver: zodResolver(schema), defaultValues: { reason: '' } })

  useEffect(() => {
    if (isOpen) reset({ reason: '' })
  }, [isOpen, reset])

  if (!isOpen) return null

  const submit = handleSubmit(async ({ reason }) => {
    if (await onConfirm(reason.trim())) onClose()
  })

  return (
    <Modal isOpen onClose={submitting ? () => undefined : onClose} size="sm" closeOnEscape={!submitting}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
          {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
        </div>
        <FormField label="Reason" htmlFor="reason-dialog-reason" required error={errors.reason?.message}>
          <Textarea id="reason-dialog-reason" rows={3} maxLength={maxLength} className="rounded-lg" autoFocus placeholder={placeholder} {...register('reason')} />
        </FormField>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" size="sm" isLoading={submitting}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
