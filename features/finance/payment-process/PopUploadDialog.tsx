'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { Select } from '@/design-system/inputs'
import { Spinner } from '@/design-system/loaders'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { FileDropzone } from '@/components/file-dropzone/FileDropzone'
import { SingleDatePicker } from '@/components/single-date-picker/SingleDatePicker'
import { PaymentDocumentListItem, useAddPopMutation, useGetFxTodayQuery, useGetPaymentDocumentQuery } from '@/services/api/finance.api'
import { CURRENCIES } from '../payment-requests/schema'
import { FormField, fieldClass } from '../shared/FormField'
import { formatCurrencyAmount, formatDay, formatDocNo, formatMoney, todayInputValue } from '../shared/format'
import { SelectShell } from '../shared/SelectShell'
import { financeErrorMessage, useFinanceFeedback } from '../shared/useFinanceFeedback'
import { convertedAmount, parseNumber, remainingAfter, round2, withinBalance } from './popMath'
import { PopFormValues, makePopSchema } from './popSchema'
import { RequestInfo } from './RequestInfo'

const BASE_CURRENCY = 'CAD'

interface PopUploadDialogProps {
  row: PaymentDocumentListItem | null
  onClose: () => void
}

/** The request behind a payment, and the form that records a payment against it. */
export const PopUploadDialog: React.FC<PopUploadDialogProps> = ({ row, onClose }) => (
  <Modal isOpen={!!row} onClose={onClose} title="View Request" size="lg">
    {row && <PopForm key={row.id} row={row} onClose={onClose} />}
  </Modal>
)

const PopForm: React.FC<{ row: PaymentDocumentListItem; onClose: () => void }> = ({ row, onClose }) => {
  const feedback = useFinanceFeedback()
  const [addPop, { isLoading: saving }] = useAddPopMutation()
  const [serverError, setServerError] = useState<string | null>(null)
  const detail = useGetPaymentDocumentQuery(row.id)

  // The currency can be corrected until the first payment is recorded; after that earlier payments depend on it.
  const currencyLocked = row.paidAmount > 0
  const [currency, setCurrency] = useState(row.currency)
  const needsFx = currency !== BASE_CURRENCY
  const schema = useMemo(() => makePopSchema(row.balance, needsFx), [row.balance, needsFx])
  const currencyOptions = [...new Set([...CURRENCIES, row.currency])].map((code) => ({ value: code, label: code }))

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
      currency: row.currency,
      files: [],
    },
  })

  const type = watch('type')
  const amountText = watch('amount')
  const rateText = watch('fxRate')
  const amount = parseNumber(amountText)
  const rate = needsFx ? parseNumber(rateText) : 1

  const fx = useGetFxTodayQuery({ from: currency, to: BASE_CURRENCY }, { skip: !needsFx })

  // Prefill the rate once the quote arrives, unless the user already typed one.
  useEffect(() => {
    if (fx.data && !dirtyFields.fxRate) setValue('fxRate', String(fx.data.rate))
  }, [fx.data, dirtyFields.fxRate, setValue])

  const onCurrencyChange = (next: string) => {
    setCurrency(next)
    setValue('currency', next, { shouldValidate: true })
    // The old rate belonged to the old currency
    setValue('fxRate', next === BASE_CURRENCY ? '1' : '')
  }

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
    if (values.currency !== row.currency) body.append('currency', values.currency)
    if (needsFx) body.append('fxRate', String(parseNumber(values.fxRate)))
    if (values.reference.trim()) body.append('reference', values.reference.trim())
    if (values.files[0]) body.append('document', values.files[0])
    try {
      const result = await addPop({ id: row.id, body }).unwrap()
      feedback.success(`Payment recorded. Balance ${formatCurrencyAmount(values.currency, result.balance)}.`)
      onClose()
    } catch (error) {
      setServerError(financeErrorMessage(error, 'Could not record the payment'))
    }
  })

  const remaining = remainingAfter(row.balance, amount)

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="text-sm text-text-muted">
        {formatDocNo(row.id)} · {row.partner.name} · {formatCurrencyAmount(currency, row.amount)} · balance{' '}
        {formatCurrencyAmount(currency, row.balance)}
      </p>

      <section className="rounded-lg border border-border p-3">
        <h3 className="mb-2 text-sm font-semibold text-text-primary">Request</h3>
        {detail.isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner size="sm" />
          </div>
        ) : detail.data ? (
          <RequestInfo request={detail.data.request} />
        ) : (
          <p className="text-sm text-danger-600">Could not load the request details.</p>
        )}
      </section>

      <FormField label="Proof of payment" error={errors.files?.message as string | undefined}>
        <Controller
          control={control}
          name="files"
          render={({ field }) => (
            <FileDropzone files={field.value} onChange={field.onChange} title="Upload proof of payment" hint="Optional · bank confirmation / wire receipt · PDF or image" />
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
              ? `Locked to the remaining balance ${formatCurrencyAmount(currency, row.balance)}`
              : Number.isFinite(amount) && !withinBalance(amount, row.balance)
                ? `Exceeds the balance ${formatCurrencyAmount(currency, row.balance)} by ${formatCurrencyAmount(currency, amount - row.balance)}`
                : `Max ${formatCurrencyAmount(currency, row.balance)} · remaining after this: ${formatCurrencyAmount(currency, remaining)}`
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

        <FormField
          label="Currency"
          htmlFor="pop-currency"
          error={errors.currency?.message}
          hint={currencyLocked ? 'Locked: a payment was already recorded' : 'Change it if the request has the wrong currency'}
        >
          <SelectShell>
            <Select
              id="pop-currency"
              className="appearance-none rounded-lg pr-9"
              value={currency}
              disabled={currencyLocked}
              onChange={(event) => onCurrencyChange(event.target.value)}
              options={currencyOptions}
            />
          </SelectShell>
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
                  {currency} to {BASE_CURRENCY}
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
          Submit
        </Button>
      </div>
    </form>
  )
}
