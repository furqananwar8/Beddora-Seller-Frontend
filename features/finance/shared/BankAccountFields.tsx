'use client'

import React from 'react'
import { useFormContext } from 'react-hook-form'
import { FormField, fieldClass } from './FormField'
import type { BankAccountValues } from './bankAccountSchema'

interface BankAccountFieldsProps {
  /** Prefix for input ids so two forms on a page never clash. */
  idPrefix: string
  swiftRequired: boolean
  holderLabel: string
  /** Replaces the default IBAN / account no hint, e.g. "leave blank to keep" when editing. */
  identifierHint?: string
}

/** IBAN, account no, SWIFT, routing no and holder inputs. Render inside a FormProvider whose values include {@link BankAccountValues}. */
export const BankAccountFields: React.FC<BankAccountFieldsProps> = ({ idPrefix, swiftRequired, holderLabel, identifierHint = 'Enter the IBAN, the account number, or both' }) => {
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<BankAccountValues>()
  const id = (name: string) => `${idPrefix}-${name}`

  return (
    <>
      <FormField label="IBAN" htmlFor={id('iban')} error={errors.iban?.message}>
        <input
          id={id('iban')}
          autoComplete="off"
          placeholder="GB29 NWBK 6016 1331 9268 19"
          className={`${fieldClass(errors.iban?.message ?? errors.accountNumber?.message)} font-mono`}
          {...register('iban')}
        />
      </FormField>
      <FormField label="Account no" htmlFor={id('account')} error={errors.accountNumber?.message} hint={identifierHint}>
        <input id={id('account')} autoComplete="off" className={`${fieldClass(errors.accountNumber?.message)} font-mono`} {...register('accountNumber')} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="SWIFT code" htmlFor={id('swift')} required={swiftRequired} error={errors.swiftCode?.message} hint={swiftRequired ? undefined : 'Optional'}>
          <input
            id={id('swift')}
            autoComplete="off"
            placeholder="NWBKGB2L"
            maxLength={11}
            className={`${fieldClass(errors.swiftCode?.message)} font-mono`}
            {...register('swiftCode', { onChange: (event) => setValue('swiftCode', event.target.value.toUpperCase().replace(/\s+/g, '')) })}
          />
        </FormField>
        <FormField label="Routing no" htmlFor={id('routing')} error={errors.routingNo?.message}>
          <input id={id('routing')} autoComplete="off" inputMode="numeric" className={fieldClass(errors.routingNo?.message)} {...register('routingNo')} />
        </FormField>
      </div>
      <FormField label={holderLabel} htmlFor={id('holder')} error={errors.accountHolder?.message}>
        <input id={id('holder')} autoComplete="off" className={fieldClass(errors.accountHolder?.message)} {...register('accountHolder')} />
      </FormField>
    </>
  )
}
