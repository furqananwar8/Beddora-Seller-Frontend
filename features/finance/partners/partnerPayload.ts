import { bankAccountFields, presentFields } from '../shared/bankAccountPayload'
import type { PartnerFormValues, PaymentMethodFormValues, StagedPaymentMethod } from './partnerSchema'

/**
 * JSON body for POST /finance/partners: the partner and the payment methods added on the form, saved together
 * (all or nothing). Documents are not sent; they are added once the partner exists, when editing it.
 */
export function buildPartnerCreateBody(values: PartnerFormValues, staged: StagedPaymentMethod[]): Record<string, unknown> {
  return {
    ...presentFields({
      name: values.name,
      type: values.type,
      currency: values.currency,
      contactName: values.contactName,
      email: values.email,
      country: values.country,
      province: values.province,
      city: values.city,
      postalCode: values.postalCode,
      address: values.address,
    }),
    paymentMethods: staged.map((item) => paymentMethodFields(item.values)),
  }
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

/** A payment method's fields: bank details, or the card payment link. */
const paymentMethodFields = (values: PaymentMethodFormValues): Record<string, string> =>
  values.type === 'BANK' ? { type: values.type, ...bankAccountFields(values) } : { type: values.type, paymentLink: values.paymentLink.trim() }

/** Multipart body for POST /finance/partners/:id/payment-methods. */
export function buildPaymentMethodFormData(values: PaymentMethodFormValues, files: File[]): FormData {
  const body = new FormData()
  Object.entries(paymentMethodFields(values)).forEach(([key, value]) => body.append(key, value))
  files.forEach((file) => body.append('documents', file))
  return body
}
