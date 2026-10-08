import { z } from 'zod'
import type { BankProfile } from '@/services/api/finance.api'
import { bankAccountShape, emptyBankAccountValues, validateBankAccount } from '../shared/bankAccountSchema'

/**
 * A company bank account. SWIFT is optional here, unlike a partner's bank details. When editing, the IBAN and
 * account number are never sent back to the browser, so they are only asked for to replace the stored ones.
 */
export const makeBankProfileSchema = (editing: boolean) =>
  z
    .object({
      name: z.string().trim().min(1, 'Bank name is required').max(120, 'Keep it under 120 characters'),
      currency: z.string().length(3, 'Choose a currency'),
      creditCardName: z.string().trim().max(120, 'Keep it under 120 characters'),
      ...bankAccountShape,
    })
    .superRefine((values, ctx) => validateBankAccount(values, ctx, { swiftRequired: false, identifierRequired: !editing }))

export type BankProfileFormValues = z.infer<ReturnType<typeof makeBankProfileSchema>>

export const emptyBankProfileValues: BankProfileFormValues = { name: '', currency: 'CAD', creditCardName: '', ...emptyBankAccountValues }

/** Form values for editing a saved profile; IBAN and account number start blank (blank = keep). */
export const bankProfileFormValues = (profile: BankProfile): BankProfileFormValues => ({
  name: profile.name,
  currency: profile.currency,
  creditCardName: profile.creditCardName ?? '',
  iban: '',
  accountNumber: '',
  swiftCode: profile.swiftCode ?? '',
  routingNo: profile.routingNo ?? '',
  accountHolder: profile.accountHolder ?? '',
})
