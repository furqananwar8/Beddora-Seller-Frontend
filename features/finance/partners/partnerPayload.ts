import { appendBankAccount, appendIf } from '../shared/bankAccountPayload'
import type { PartnerFormValues, PaymentMethodFormValues } from './partnerSchema'

/** Multipart body for POST /finance/partners. */
export function buildPartnerFormData(values: PartnerFormValues): FormData {
  const body = new FormData()
  body.append('name', values.name.trim())
  body.append('type', values.type)
  body.append('currency', values.currency)
  appendIf(body, 'contactName', values.contactName)
  appendIf(body, 'email', values.email)
  appendIf(body, 'country', values.country)
  appendIf(body, 'province', values.province)
  appendIf(body, 'city', values.city)
  appendIf(body, 'postalCode', values.postalCode)
  appendIf(body, 'address', values.address)
  return body
}

/** JSON body for PATCH /finance/partners/:id; cleared optional fields go back as null. */
export function buildPartnerPatch(values: PartnerFormValues): Record<string, unknown> {
  const orNull = (value: string) => (value.trim() === '' ? null : value.trim())
  return {
    name: values.name.trim(),
    type: values.type,
    currency: values.currency,
    contactName: orNull(values.contactName),
    email: orNull(values.email),
    country: orNull(values.country),
    province: orNull(values.province),
    city: orNull(values.city),
    postalCode: orNull(values.postalCode),
    address: orNull(values.address),
  }
}

/** Multipart body for POST /finance/partners/:id/payment-methods. */
export function buildPaymentMethodFormData(values: PaymentMethodFormValues, files: File[]): FormData {
  const body = new FormData()
  body.append('type', values.type)
  if (values.type === 'BANK') {
    appendBankAccount(body, values)
  } else {
    body.append('paymentLink', values.paymentLink.trim())
  }
  files.forEach((file) => body.append('documents', file))
  return body
}
