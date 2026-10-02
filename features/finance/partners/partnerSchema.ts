import { z } from 'zod'
import type { PartnerType } from '@/services/api/finance.api'

export const CURRENCIES = ['CAD', 'USD', 'MXN', 'EUR', 'GBP', 'CNY', 'INR', 'AED'] as const

export const PARTNER_TYPE_OPTIONS: Array<{ value: PartnerType; label: string }> = [
  { value: 'VENDOR', label: 'Vendor' },
  { value: 'SUPPLIER', label: 'Supplier' },
]

export const partnerTypeLabel = (type: PartnerType): string => (type === 'VENDOR' ? 'Vendor' : 'Supplier')

/* ─────────────── Bank identifiers ─────────────── */

/** IBANs and account numbers are free text: spaces are dropped and letters upper-cased, nothing else is checked. */
export const normalizeBankId = (value: string): string => value.replace(/\s+/g, '').toUpperCase()

/* ─────────────── Partner profile ─────────────── */

export const partnerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(150, 'Name is too long'),
  type: z.enum(['VENDOR', 'SUPPLIER']),
  contactName: z.string().trim().max(150, 'Contact name is too long'),
  country: z.string().max(2),
  province: z.string().max(10),
  city: z.string().trim().max(120, 'City is too long'),
  postalCode: z.string().trim().max(12, 'Postal code is too long'),
  email: z
    .string()
    .trim()
    .refine((value) => value === '' || z.string().email().safeParse(value).success, 'Enter a valid email address'),
  address: z.string().trim().max(500, 'Street address is too long'),
  currency: z.string().min(1, 'Currency is required'),
})

export type PartnerFormValues = z.infer<typeof partnerSchema>

/** Fields the server may flag in its `issues`, so its messages land on the right input. */
export const PARTNER_FIELDS = ['name', 'type', 'contactName', 'email', 'country', 'province', 'city', 'postalCode', 'address', 'currency'] as const

export const emptyPartnerValues: PartnerFormValues = {
  name: '',
  type: 'VENDOR',
  contactName: '',
  country: '',
  province: '',
  city: '',
  postalCode: '',
  email: '',
  address: '',
  currency: 'CAD',
}

/* ─────────────── Payment method ─────────────── */

const isUrl = (value: string): boolean => {
  try {
    return Boolean(new URL(value).hostname)
  } catch {
    return false
  }
}

const SWIFT =/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/

export const paymentMethodSchema = z
  .object({
    type: z.enum(['BANK', 'CARD_LINK']),
    iban: z.string().max(80, 'IBAN is too long'),
    accountNumber: z.string().max(80, 'Account number is too long'),
    swiftCode: z.string(),
    routingNo: z.string(),
    accountHolder: z.string().max(150, 'Account holder is too long'),
    paymentLink: z.string(),
  })
  .superRefine((values, ctx) => {
    const fail = (path: keyof typeof values, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message })

    if (values.type === 'BANK') {
      // An IBAN or an account number is enough; one of them must be given
      if (!values.iban.trim() && !values.accountNumber.trim()) fail('accountNumber', 'Enter an IBAN or an account number')

      const swift = values.swiftCode.trim().toUpperCase()
      if (!swift) fail('swiftCode', 'SWIFT code is required')
      else if (!SWIFT.test(swift)) fail('swiftCode', 'Enter a valid 8 or 11 character SWIFT code')

      const routing = values.routingNo.trim()
      if (routing && !/^[0-9-]{5,12}$/.test(routing)) fail('routingNo', 'Routing number must be 5 to 12 digits')
    } else {
      const link = values.paymentLink.trim()
      if (!link) fail('paymentLink', 'Payment link is required')
      else if (!/^https?:\/\/\S+$/i.test(link) || !isUrl(link)) fail('paymentLink', 'Enter a valid http(s) link')
    }
  })

export type PaymentMethodFormValues = z.infer<typeof paymentMethodSchema>

export const emptyPaymentMethodValues: PaymentMethodFormValues = {
  type: 'BANK',
  iban: '',
  accountNumber: '',
  swiftCode: '',
  routingNo: '',
  accountHolder: '',
  paymentLink: '',
}

/** A payment method captured before the partner exists (create mode). */
export interface StagedPaymentMethod {
  key: string
  values: PaymentMethodFormValues
  files: File[]
}

/** Label matching what the API returns for saved methods. */
export function stagedMethodLabel(values: PaymentMethodFormValues): string {
  return values.type === 'BANK' ? `Bank ••${normalizeBankId(values.iban || values.accountNumber).slice(-4)}` : 'Card link'
}
