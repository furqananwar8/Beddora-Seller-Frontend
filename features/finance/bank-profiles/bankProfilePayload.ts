import { appendBankAccount, appendIf } from '../shared/bankAccountPayload'
import { normalizeBankId } from '../shared/bankAccountSchema'
import type { BankProfileFormValues } from './bankProfileSchema'

/** Multipart body for POST /finance/bank-profiles. */
export function buildBankProfileFormData(values: BankProfileFormValues, files: File[]): FormData {
  const body = new FormData()
  body.append('name', values.name.trim())
  body.append('currency', values.currency)
  appendIf(body, 'creditCardName', values.creditCardName)
  appendBankAccount(body, values)
  appendDocuments(body, files)
  return body
}

/** Multipart body for POST /finance/bank-profiles/:id/documents. */
export function buildDocumentsFormData(files: File[]): FormData {
  const body = new FormData()
  appendDocuments(body, files)
  return body
}

const appendDocuments = (body: FormData, files: File[]) => files.forEach((file) => body.append('documents', file))

/** JSON body for PATCH /finance/bank-profiles/:id. Blanks clear, except a blank IBAN / account number keeps the stored one. */
export function buildBankProfilePatch(values: BankProfileFormValues): Record<string, unknown> {
  const orUndefined = (value: string) => value.trim() || undefined
  return {
    name: values.name.trim(),
    currency: values.currency,
    creditCardName: values.creditCardName.trim(),
    iban: orUndefined(normalizeBankId(values.iban)),
    accountNumber: orUndefined(normalizeBankId(values.accountNumber)),
    swiftCode: values.swiftCode.trim().toUpperCase(),
    routingNo: values.routingNo.trim(),
    accountHolder: values.accountHolder.trim(),
  }
}
