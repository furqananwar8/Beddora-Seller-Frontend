'use client'

import React, { useEffect, useState } from 'react'
import { Controller, FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals/Modal'
import { FileDropzone } from '@/components/file-dropzone/FileDropzone'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { BankAccountFields } from '../shared/BankAccountFields'
import { FormField, fieldClass } from '../shared/FormField'
import { emptyPaymentMethodValues, paymentMethodSchema, type PaymentMethodFormValues } from './partnerSchema'

interface PaymentMethodDialogProps {
  isOpen: boolean
  title?: string
  /** Who the details belong to, shown under the title. */
  subtitle: string
  onClose: () => void
  /** The parent decides whether to stage the details locally or save them through the API. */
  onSubmit: (values: PaymentMethodFormValues, files: File[]) => Promise<void> | void
}

/** A partner's bank or card-link payment details. */
export const PaymentMethodDialog: React.FC<PaymentMethodDialogProps> = (props) => (
  <Modal isOpen={props.isOpen} onClose={props.onClose} title={props.title ?? 'Add bank details'} size="md">
    {props.isOpen && <DialogForm {...props} />}
  </Modal>
)

const DialogForm: React.FC<PaymentMethodDialogProps> = ({ subtitle, onClose, onSubmit }) => {
  const [files, setFiles] = useState<File[]>([])
  const form = useForm<PaymentMethodFormValues>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: emptyPaymentMethodValues,
  })
  const {
    register,
    control,
    handleSubmit,
    watch,
    clearErrors,
    formState: { errors, isSubmitting },
  } = form

  const type = watch('type')
  useEffect(() => clearErrors(), [type, clearErrors])

  const submit = handleSubmit(async (values) => {
    await onSubmit(values, files)
  })

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <p className="-mt-1 text-sm text-text-muted">{subtitle}</p>

        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <SegmentedToggle
              ariaLabel="Payment method type"
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: 'BANK', label: 'Bank' },
                { value: 'CARD_LINK', label: 'Credit card' },
              ]}
            />
          )}
        />

        {type === 'BANK' ? (
          <>
            <BankAccountFields idPrefix="pm" swiftRequired holderLabel="Account holder" />
            <FormField label="Documents">
              <FileDropzone multiple files={files} onChange={setFiles} title="Upload documents" hint="Void cheque / bank letter" />
            </FormField>
          </>
        ) : (
          <>
            <FormField label="Payment link" htmlFor="pm-link" required error={errors.paymentLink?.message}>
              <input id="pm-link" type="url" autoComplete="off" placeholder="https://" className={fieldClass(errors.paymentLink?.message)} {...register('paymentLink')} />
            </FormField>
            <p className="rounded-lg bg-secondary-100 px-3 py-2 text-sm text-text-secondary">
              Card numbers are never collected or stored. Finance pays through the vendor&apos;s own link.
            </p>
          </>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Add
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
