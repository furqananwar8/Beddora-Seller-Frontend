import { z } from 'zod'
import type { PoRef, ReferenceType } from '@/services/api/finance.api'

export const CURRENCIES = ['CAD', 'USD', 'EUR', 'GBP', 'CNY', 'INR', 'AED', 'PKR', 'AUD', 'JPY']

/** "12,450.50" -> 12450.5, NaN when it is not a number. */
export const parseAmount = (value: string): number => Number(value.replace(/,/g, '').trim())

export const REFERENCE_OPTIONS: Array<{ value: ReferenceType; label: string }> = [
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'PURCHASE_ORDER', label: 'Purchase order' },
]

export const paymentRequestSchema = z.object({
  partnerId: z.string().min(1, 'Choose a partner'),
  /** Paying a supplier invoice, or one of our purchase orders (then there is no invoice no.). */
  referenceType: z.enum(['INVOICE', 'PURCHASE_ORDER']),
  invoiceNo: z.string().trim().max(80, 'Keep it under 80 characters'),
  purchaseOrder: z.custom<PoRef | null>(),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  /** Picked from the container listing; it then sets the destination. */
  containerNo: z.string().trim().max(60, 'Keep it under 60 characters'),
  marketplaceId: z.string(),
  currency: z.string().min(1, 'Choose a currency'),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((value) => Number.isFinite(parseAmount(value)), 'Enter a valid amount')
    .refine((value) => parseAmount(value) > 0, 'Amount must be greater than zero'),
  /** The L4 cost center the expense is booked to. */
  costCenterId: z.string().min(1, 'Choose an expense'),
  remarks: z.string().trim().max(1000, 'Keep it under 1000 characters'),
}).superRefine((values, ctx) => {
  if (values.referenceType === 'INVOICE' && !values.invoiceNo.trim()) ctx.addIssue({ code: 'custom', path: ['invoiceNo'], message: 'Invoice number is required' })
  if (values.referenceType === 'PURCHASE_ORDER' && !values.purchaseOrder) ctx.addIssue({ code: 'custom', path: ['purchaseOrder'], message: 'Pick the purchase order being paid' })
})

export type PaymentRequestFormValues = z.infer<typeof paymentRequestSchema>

export const emptyFormValues: PaymentRequestFormValues = {
  partnerId: '',
  referenceType: 'INVOICE',
  invoiceNo: '',
  purchaseOrder: null,
  invoiceDate: '',
  containerNo: '',
  marketplaceId: '',
  currency: '',
  amount: '',
  costCenterId: '',
  remarks: '',
}

const isPo = (values: PaymentRequestFormValues) => values.referenceType === 'PURCHASE_ORDER'

/** JSON body for PATCH, shared by edit and the save-after-create retry path. */
export function toUpdateBody(values: PaymentRequestFormValues) {
  return {
    partnerId: Number(values.partnerId),
    referenceType: values.referenceType,
    invoiceNo: isPo(values) ? null : values.invoiceNo.trim(),
    purchaseOrderId: isPo(values) ? (values.purchaseOrder?.id ?? null) : null,
    invoiceDate: values.invoiceDate,
    containerNo: values.containerNo.trim() || null,
    marketplaceId: values.marketplaceId ? Number(values.marketplaceId) : null,
    costCenterId: Number(values.costCenterId),
    currency: values.currency,
    amount: parseAmount(values.amount),
    remarks: values.remarks.trim() || null,
  }
}

export function toCreateFormData(values: PaymentRequestFormValues, files: File[]): FormData {
  const body = new FormData()
  body.append('partnerId', values.partnerId)
  body.append('referenceType', values.referenceType)
  if (isPo(values)) {
    if (values.purchaseOrder) body.append('purchaseOrderId', String(values.purchaseOrder.id))
  } else {
    body.append('invoiceNo', values.invoiceNo.trim())
  }
  if (values.containerNo.trim()) body.append('containerNo', values.containerNo.trim())
  body.append('invoiceDate', values.invoiceDate)
  if (values.marketplaceId) body.append('marketplaceId', values.marketplaceId)
  body.append('costCenterId', values.costCenterId)
  body.append('currency', values.currency)
  body.append('amount', String(parseAmount(values.amount)))
  if (values.remarks.trim()) body.append('remarks', values.remarks.trim())
  files.forEach((file) => body.append('documents', file))
  return body
}

export function filesFormData(files: File[]): FormData {
  const body = new FormData()
  files.forEach((file) => body.append('documents', file))
  return body
}
