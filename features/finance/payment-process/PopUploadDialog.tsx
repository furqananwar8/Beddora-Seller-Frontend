'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { FileDropzone } from '@/components/file-dropzone/FileDropzone'
import { SingleDatePicker } from '@/components/single-date-picker/SingleDatePicker'
import { PaymentDocumentListItem, useAddPopMutation, useGetFxTodayQuery } from '@/services/api/finance.api'
import { FormField, fieldClass } from '../shared/FormField'
import { formatCurrencyAmount, formatDay, formatDocNo, formatMoney, todayInputValue } from '../shared/format'
import { financeErrorMessage, useFinanceFeedback } from '../shared/useFinanceFeedback'
import { convertedAmount, parseNumber, remainingAfter, round2 } from './popMath'
import { PopFormValues, makePopSchema } from './popSchema'

const BASE_CURRENCY = 'CAD'

interface PopUploadDialogProps {
  row: PaymentDocumentListItem | null
  onClose: () => void
}

export const PopUploadDialog: React.FC<PopUploadDialogProps> = ({ row, onClose }) => (
  <Modal isOpen={!!row} onClose={onClose} title="Upload Proof of Payment" size="lg">
    {row && <PopForm key={row.id} row={row} onClose={onClose} />}
  </Modal>
)

const PopForm: React.FC<{ row: PaymentDocumentListItem; onClose: () => void }> = ({ row, onClose }) => {
  const needsFx = row.currency !== BASE_CURRENCY
  const feedback = useFinanceFeedback()
  const [addPop, { isLoading: saving }] = useAddPopMutation()
  const [serverError, setServerError] = useState<string | null>(null)
  const schema = useMemo(() => makePopSchema(row.balance, needsFx), [row.balance, needsFx])

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, dirtyFields },
  } = useForm<PopFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'FULL',
      amount: round2(row.balance).toFixed(2),
      paymentDate: todayInputValue(),
      fxRate: needsFx ? '' : '1',
      reference: '',
      files: [],
    },
  })

  const type = watch('type')
  const amountText = watch('amount')
  const rateText = watch('fxRate')
  const amount = parseNumber(amountText)
  const rate = needsFx ? parseNumber(rateText) : 1

  const fx = useGetFxTodayQuery({ from: row.currency, to: BASE_CURRENCY }, { skip: !needsFx })

  // Prefill the rate once the quote arrives, unless the user already typed one.
  useEffect(() => {
    if (fx.data && !dirtyFields.fxRate) setValue('fxRate', String(fx.data.rate))
  }, [fx.data, dirtyFields.fxRate, setValue])

  const onTypeChange = (next: 'FULL' | 'SPLIT') => {
    setValue('type', next)
    if (next === 'FULL') setValue('amount', round2(row.balance).toFixed(2), { shouldValidate: true })
  }

  const submit = handleSubmit(async (values) => {
    setServerError(null)
    const body = new FormData()
    body.append('type', values.type)
    body.append('amount', String(parseNumber(values.amount)))
    body.append('paymentDate', values.paymentDate)
    if (needsFx) body.append('fxRate', String(parseNumber(values.fxRate)))
    if (values.reference.trim()) body.append('reference', values.reference.trim())
    body.append('document', values.files[0])
    try {
      const result = await addPop({ id: row.id, body }).unwrap()
      feedback.success(`Payment recorded. Balance ${formatCurrencyAmount(row.currency, result.balance)}.`)
      onClose()
    } catch (error) {
      setServerError(financeErrorMessage(error, 'Could not record the payment'))
    }
  })

  const remaining = remainingAfter(row.balance, amount)

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="text-sm text-text-muted">
        {formatDocNo(row.id)} · {row.partner.name} · {formatCurrencyAmount(row.currency, row.amount)} · balance{' '}
        {formatCurrencyAmount(row.currency, row.balance)}
      </p>

      <FormField label="POP Document Upload" required error={errors.files?.message as string | undefined}>
        <Controller
          control={control}
          name="files"
          render={({ field }) => (
            <FileDropzone files={field.value} onChange={field.onChange} title="Upload proof of payment" hint="Bank confirmation / wire receipt · PDF or image" />
          )}
        />
      </FormField>

      <FormField label="Payment type">
        <div>
          <SegmentedToggle
            ariaLabel="Payment type"
            value={type}
            onChange={onTypeChange}
            options={[
              { value: 'FULL', label: 'Full' },
              { value: 'SPLIT', label: 'Split' },
            ]}
          />
        </div>
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Amount"
          htmlFor="pop-amount"
          required
          error={errors.amount?.message}
          hint={
            type === 'FULL'
              ? `Locked to the remaining balance ${formatCurrencyAmount(row.currency, row.balance)}`
              : `Max ${formatCurrencyAmount(row.currency, row.balance)} · remaining after this: ${formatCurrencyAmount(row.currency, remaining)}`
          }
        >
          <input
            id="pop-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            readOnly={type === 'FULL'}
            className={fieldClass(errors.amount?.message)}
            {...register('amount')}
          />
        </FormField>

        <FormField label="Currency" htmlFor="pop-currency" hint="from request">
          <input id="pop-currency" readOnly value={row.currency} className={fieldClass()} />
        </FormField>

        <FormField label="Payment Date" htmlFor="pop-date" required error={errors.paymentDate?.message}>
          <Controller
            control={control}
            name="paymentDate"
            render={({ field }) => (
              <SingleDatePicker id="pop-date" value={field.value} onChange={field.onChange} error={errors.paymentDate?.message} />
            )}
          />
        </FormField>

        <FormField label="Reference / UTR" htmlFor="pop-reference" error={errors.reference?.message}>
          <input id="pop-reference" placeholder="Optional" className={fieldClass(errors.reference?.message)} {...register('reference')} />
        </FormField>

        {needsFx && (
          <>
            <FormField
              label="Exchange Rate (today)"
              htmlFor="pop-rate"
              required
              error={errors.fxRate?.message}
              hint={
                fx.isLoading
                  ? 'Fetching today’s rate...'
                  : fx.isError
                    ? 'No rate available for today. Enter the rate manually.'
                    : fx.data
                      ? `Rate as of ${formatDay(fx.data.asOf)}`
                      : undefined
              }
            >
              <div className="relative">
                <input
                  id="pop-rate"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  className={`${fieldClass(errors.fxRate?.message)} pr-20`}
                  {...register('fxRate')}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-text-muted">
                  {row.currency} to {BASE_CURRENCY}
                </span>
              </div>
            </FormField>

            <FormField label="Exchange Rate Amount" htmlFor="pop-converted" hint="= Amount x Rate (read-only)">
              <input
                id="pop-converted"
                readOnly
                value={`${BASE_CURRENCY} ${formatMoney(convertedAmount(amount, rate))}`}
                className={fieldClass()}
              />
            </FormField>
          </>
        )}
      </div>

      {serverError && (
        <p role="alert" className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {serverError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={saving}>
          Upload
        </Button>
      </div>
    </form>
  )
}
