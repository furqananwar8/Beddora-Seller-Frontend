import { z } from 'zod'

/** IBANs and account numbers are free text: spaces are dropped and letters upper-cased, nothing else is checked. */
export const normalizeBankId = (value: string): string => value.replace(/\s+/g, '').toUpperCase()

/** Bank account fields shared by a partner's bank method and a bank profile. */
export const bankAccountShape = {
  iban: z.string().max(80, 'IBAN is too long'),
  accountNumber: z.string().max(80, 'Account number is too long'),
  swiftCode: z.string(),
  routingNo: z.string(),
  accountHolder: z.string().max(150, 'Account holder is too long'),
}

export type BankAccountValues = { [K in keyof typeof bankAccountShape]: string }

export const emptyBankAccountValues: BankAccountValues = { iban: '', accountNumber: '', swiftCode: '', routingNo: '', accountHolder: '' }

const SWIFT = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/

interface BankAccountRules {
  swiftRequired: boolean
  /** False when editing: the stored IBAN / account number is kept unless a new one is typed. */
  identifierRequired?: boolean
}

/** Cross-field rules for a bank account: IBAN or account number, a valid SWIFT (required or not) and routing number. */
export function validateBankAccount(values: BankAccountValues, ctx: z.RefinementCtx, { swiftRequired, identifierRequired = true }: BankAccountRules): void {
  const fail = (path: keyof BankAccountValues, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })

  if (identifierRequired && !values.iban.trim() && !values.accountNumber.trim()) fail('accountNumber', 'Enter an IBAN or an account number')

  const swift = values.swiftCode.trim().toUpperCase()
  if (!swift) {
    if (swiftRequired) fail('swiftCode', 'SWIFT code is required')
  } else if (!SWIFT.test(swift)) fail('swiftCode', 'Enter a valid 8 or 11 character SWIFT code')

  const routing = values.routingNo.trim()
  if (routing && !/^[0-9-]{5,12}$/.test(routing)) fail('routingNo', 'Routing number must be 5 to 12 digits')
}
