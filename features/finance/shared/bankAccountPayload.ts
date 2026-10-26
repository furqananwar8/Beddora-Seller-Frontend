import { normalizeBankId, type BankAccountValues } from './bankAccountSchema'

/** Trimmed fields, leaving out blanks so the server sees them as absent. */
export const presentFields = (fields: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(fields).flatMap(([key, value]) => (value.trim() === '' ? [] : [[key, value.trim()]])))

/** Appends a trimmed value, skipping blanks so the server sees the field as absent. */
export const appendIf = (body: FormData, key: string, value: string) => {
  if (value.trim() !== '') body.append(key, value.trim())
}

/** Bank account fields, identifiers normalised the way the server stores them (blanks left out). */
export const bankAccountFields = (values: BankAccountValues): Record<string, string> =>
  presentFields({
    iban: normalizeBankId(values.iban),
    accountNumber: normalizeBankId(values.accountNumber),
    swiftCode: values.swiftCode.toUpperCase(),
    routingNo: values.routingNo,
    accountHolder: values.accountHolder,
  })

/** Bank account fields for a multipart body. */
export function appendBankAccount(body: FormData, values: BankAccountValues): void {
  Object.entries(bankAccountFields(values)).forEach(([key, value]) => body.append(key, value))
}
