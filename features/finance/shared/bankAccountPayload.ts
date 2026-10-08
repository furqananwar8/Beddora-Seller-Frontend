import { normalizeBankId, type BankAccountValues } from './bankAccountSchema'

/** Appends a trimmed value, skipping blanks so the server sees the field as absent. */
export const appendIf = (body: FormData, key: string, value: string) => {
  if (value.trim() !== '') body.append(key, value.trim())
}

/** Bank account fields for a multipart body; identifiers are normalised the way the server stores them. */
export function appendBankAccount(body: FormData, values: BankAccountValues): void {
  appendIf(body, 'iban', normalizeBankId(values.iban))
  appendIf(body, 'accountNumber', normalizeBankId(values.accountNumber))
  appendIf(body, 'swiftCode', values.swiftCode.toUpperCase())
  appendIf(body, 'routingNo', values.routingNo)
  appendIf(body, 'accountHolder', values.accountHolder)
}
