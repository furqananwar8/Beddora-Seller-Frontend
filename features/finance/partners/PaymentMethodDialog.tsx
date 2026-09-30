'use client'

import React, { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals/Modal'
import { FileDropzone } from '@/components/file-dropzone/FileDropzone'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { FormField, fieldClass } from '../shared/FormField'
import { formatPartnerNo } from '../shared/format'
import {
  emptyPaymentMethodValues,
  formatIban,
  paymentMethodSchema,
  type PaymentMethodFormValues,
} from './partnerSchema'

interface PaymentMethodDialogProps {
  isOpen: boolean
  partnerName: string
  /** Undefined while the partner has not been created yet. */
  partnerId?: number
  onClose: () => void
  /** The parent decides whether to stage the method locally or save it through the API. */
  onSubmit: (values: PaymentMethodFormValues, files: File[]) => Promise<void> | void
}

export const PaymentMethodDialog: React.FC<PaymentMethodDialogProps> = (props) => (
  <Modal isOpen={props.isOpen} onClose={props.onClose} title="Add bank details" size="md">
    {props.isOpen && <DialogForm {...props} />}
  </Modal>
)

const DialogForm: React.FC<PaymentMethodDialogProps> = ({ partnerName, partnerId, onClose, onSubmit }) => {
  const [files, setFiles] = useState<File[]>([])
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<PaymentMethodFormValues>({ resolver: zodResolver(paymentMethodSchema), defaultValues: emptyPaymentMethodValues })

  const type = watch('type')
  useEffect(() => clearErrors(), [type, clearErrors])

  const submit = handleSubmit(async (values) => {
    await onSubmit(values, files)
  })

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <p className="-mt-1 text-sm text-text-muted">
        {partnerName || 'New partner'} · {partnerId ? formatPartnerNo(partnerId) : 'New'}
      </p>

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
          <FormField label="IBAN" htmlFor="pm-iban" required error={errors.iban?.message}>
            <input
              id="pm-iban"
              autoComplete="off"
              placeholder="GB29 NWBK 6016 1331 9268 19"
              className={`${fieldClass(errors.iban?.message)} font-mono`}
              {...register('iban', { onChange: (event) => setValue('iban', formatIban(event.target.value)) })}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="SWIFT code" htmlFor="pm-swift" required error={errors.swiftCode?.message}>
              <input
                id="pm-swift"
                autoComplete="off"
                placeholder="NWBKGB2L"
                maxLength={11}
                className={`${fieldClass(errors.swiftCode?.message)} font-mono`}
                {...register('swiftCode', { onChange: (event) => setValue('swiftCode', event.target.value.toUpperCase().replace(/\s+/g, '')) })}
              />
            </FormField>
            <FormField label="Routing no" htmlFor="pm-routing" error={errors.routingNo?.message} hint="For US/CA banks">
              <input id="pm-routing" autoComplete="off" inputMode="numeric" className={fieldClass(errors.routingNo?.message)} {...register('routingNo')} />
            </FormField>
          </div>
          <FormField label="Account holder" htmlFor="pm-holder" error={errors.accountHolder?.message}>
            <input id="pm-holder" autoComplete="off" className={fieldClass(errors.accountHolder?.message)} {...register('accountHolder')} />
          </FormField>
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
  )
}
