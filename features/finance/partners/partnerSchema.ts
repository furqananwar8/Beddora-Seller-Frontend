import { z } from 'zod'
import type { PartnerType } from '@/services/api/finance.api'

export const CURRENCIES = ['CAD', 'USD', 'MXN', 'EUR', 'GBP', 'CNY', 'INR', 'AED'] as const

export const PARTNER_TYPE_OPTIONS: Array<{ value: PartnerType; label: string }> = [
  { value: 'VENDOR', label: 'Vendor' },
  { value: 'SUPPLIER', label: 'Supplier' },
]

export const partnerTypeLabel = (type: PartnerType): string => (type === 'VENDOR' ? 'Vendor' : 'Supplier')

/* ─────────────── IBAN (ISO 13616 mod-97) ─────────────── */

export const normalizeIban = (value: string): string => value.replace(/\s+/g, '').toUpperCase()

export function isValidIban(value: string): boolean {
  const iban = normalizeIban(value)
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) return false
  const rearranged = iban.slice(4) + iban.slice(0, 4)
  let remainder = 0
  for (const char of rearranged) {
    const digits = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97
  }
  return remainder === 1
}

/** Groups an IBAN in blocks of four for display while typing. */
export const formatIban = (value: string): string => normalizeIban(value).replace(/(.{4})/g, '$1 ').trim()

/* ─────────────── Partner profile ─────────────── */

export const partnerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(150, 'Name is too long'),
  type: z.enum(['VENDOR', 'SUPPLIER']),
  country: z.string().max(2),
  email: z
    .string()
    .trim()
    .refine((value) => value === '' || z.string().email().safeParse(value).success, 'Enter a valid email address'),
  address: z.string().trim().max(500, 'Address is too long'),
  currency: z.string().min(1, 'Currency is required'),
})

export type PartnerFormValues = z.infer<typeof partnerSchema>

export const emptyPartnerValues: PartnerFormValues = {
  name: '',
  type: 'VENDOR',
  country: '',
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
    iban: z.string(),
    swiftCode: z.string(),
    routingNo: z.string(),
    accountHolder: z.string().max(150, 'Account holder is too long'),
    paymentLink: z.string(),
  })
  .superRefine((values, ctx) => {
    const fail = (path: keyof typeof values, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message })

    if (values.type === 'BANK') {
      if (!values.iban.trim()) fail('iban', 'IBAN is required')
      else if (!isValidIban(values.iban)) fail('iban', 'Enter a valid IBAN (checksum failed)')

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
  return values.type === 'BANK' ? `Bank ••${normalizeIban(values.iban).slice(-4)}` : 'Card link'
}
