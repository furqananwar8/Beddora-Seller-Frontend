import { z } from 'zod'
import type { PartnerType } from '@/services/api/finance.api'
import { bankAccountShape, emptyBankAccountValues, normalizeBankId, validateBankAccount } from '../shared/bankAccountSchema'

export const CURRENCIES = ['CAD', 'USD', 'MXN', 'EUR', 'GBP', 'CNY', 'INR', 'AED'] as const

export const PARTNER_TYPE_OPTIONS: Array<{ value: PartnerType; label: string }> = [
  { value: 'VENDOR', label: 'Vendor' },
  { value: 'SUPPLIER', label: 'Supplier' },
]

export const partnerTypeLabel = (type: PartnerType): string => (type === 'VENDOR' ? 'Vendor' : 'Supplier')

/* ─────────────── Bank identifiers ─────────────── */

export { normalizeBankId } from '../shared/bankAccountSchema'

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

export const paymentMethodSchema = z
  .object({
    type: z.enum(['BANK', 'CARD_LINK']),
    ...bankAccountShape,
    paymentLink: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.type === 'BANK') {
      validateBankAccount(values, ctx, { swiftRequired: true })
      return
    }
    const link = values.paymentLink.trim()
    if (!link) ctx.addIssue({ code: 'custom', path: ['paymentLink'], message: 'Payment link is required' })
    else if (!/^https?:\/\/\S+$/i.test(link) || !isUrl(link)) ctx.addIssue({ code: 'custom', path: ['paymentLink'], message: 'Enter a valid http(s) link' })
  })

export type PaymentMethodFormValues = z.infer<typeof paymentMethodSchema>

export const emptyPaymentMethodValues: PaymentMethodFormValues = {
  type: 'BANK',
  ...emptyBankAccountValues,
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
