import { z } from 'zod'
import type { PaymentRequestDetail, PoRef, ReferenceType } from '@/services/api/finance.api'
import { formatCurrencyAmount, formatMoney } from '../shared/format'

/** "12,450.50" -> 12450.5, NaN when it is not a number. */
export const parseAmount = (value: string): number => Number(value.replace(/,/g, '').trim())

/** Unparsable while typing counts as 0, so totals stay live. */
const amountOf = (value: string): number => (Number.isFinite(parseAmount(value)) ? parseAmount(value) : 0)

export const REFERENCE_OPTIONS: Array<{ value: ReferenceType; label: string }> = [
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'PURCHASE_ORDER', label: 'Purchase order' },
]

/** Same cap as the server. */
export const MAX_REQUEST_LINES = 20

/** One amount and the L4 cost center it is booked to. */
const lineSchema = z.object({
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((value) => Number.isFinite(parseAmount(value)), 'Enter a valid amount')
    .refine((value) => parseAmount(value) > 0, 'Amount must be greater than zero'),
  costCenterId: z.string().min(1, 'Choose an expense'),
})

export type RequestLineValues = z.infer<typeof lineSchema>

export const emptyLine: RequestLineValues = { amount: '', costCenterId: '' }

const baseSchema = z.object({
  partnerId: z.string().min(1, 'Choose a partner'),
  /** Paying a supplier invoice, or one of our purchase orders (then there is no invoice no.). */
  referenceType: z.enum(['INVOICE', 'PURCHASE_ORDER']),
  invoiceNo: z.string().trim().max(80, 'Keep it under 80 characters'),
  purchaseOrder: z.custom<PoRef | null>(),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  /** Picked from the container listing; it then sets the destination (unless a PO already did). */
  containerNo: z.string().trim().max(60, 'Keep it under 60 characters'),
  marketplaceId: z.string(),
  currency: z.string().min(1, 'Choose a currency'),
  /** Several on an invoice request, exactly one on a purchase-order request. */
  lines: z.array(lineSchema).min(1, 'Add an amount').max(MAX_REQUEST_LINES, `Up to ${MAX_REQUEST_LINES} amounts`),
  remarks: z.string().trim().max(1000, 'Keep it under 1000 characters'),
})

export type PaymentRequestFormValues = z.infer<typeof baseSchema>

/** The total of a request's lines. */
export const requestTotal = (lines: Array<Pick<RequestLineValues, 'amount'>>): number =>
  Math.round(lines.reduce((sum, line) => sum + amountOf(line.amount), 0) * 100) / 100

/** What the picked purchase order still takes; a PO request may not ask for more. */
export interface PoLimit {
  currency: string
  amount: number
  leftToRequest: number
}

/** Schema depends on the picked PO: its open balance caps the request's total. */
export const makePaymentRequestSchema = (poLimit: PoLimit | null) =>
  baseSchema.superRefine((values, ctx) => {
    const isPo = values.referenceType === 'PURCHASE_ORDER'
    if (!isPo && !values.invoiceNo.trim()) ctx.addIssue({ code: 'custom', path: ['invoiceNo'], message: 'Invoice number is required' })
    if (isPo && !values.purchaseOrder) ctx.addIssue({ code: 'custom', path: ['purchaseOrder'], message: 'Pick the purchase order being paid' })
    if (isPo && values.lines.length > 1) ctx.addIssue({ code: 'custom', path: ['lines'], message: 'A purchase-order request takes a single amount' })
    if (isPo && poLimit && requestTotal(values.lines) > poLimit.leftToRequest) {
      ctx.addIssue({ code: 'custom', path: ['lines', 0, 'amount'], message: poLimitMessage(poLimit) })
    }
  })

export const poLimitMessage = ({ currency, amount, leftToRequest }: PoLimit): string =>
  `The PO is worth ${formatCurrencyAmount(currency, amount)}; at most ${formatCurrencyAmount(currency, leftToRequest)} is left to request`

export const emptyFormValues: PaymentRequestFormValues = {
  partnerId: '',
  referenceType: 'INVOICE',
  invoiceNo: '',
  purchaseOrder: null,
  invoiceDate: '',
  containerNo: '',
  marketplaceId: '',
  currency: '',
  lines: [emptyLine],
  remarks: '',
}

export const linesFromDetail = (detail: PaymentRequestDetail): RequestLineValues[] =>
  detail.lines.length
    ? detail.lines.map((line) => ({ amount: formatMoney(line.amount), costCenterId: line.costCenter ? String(line.costCenter.id) : '' }))
    : [emptyLine]

const isPo = (values: PaymentRequestFormValues) => values.referenceType === 'PURCHASE_ORDER'

const linesBody = (values: PaymentRequestFormValues) =>
  values.lines.map((line) => ({ costCenterId: Number(line.costCenterId), amount: parseAmount(line.amount) }))

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
    currency: values.currency,
    lines: linesBody(values),
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
  body.append('currency', values.currency)
  body.append('lines', JSON.stringify(linesBody(values)))
  if (values.remarks.trim()) body.append('remarks', values.remarks.trim())
  files.forEach((file) => body.append('documents', file))
  return body
}

export function filesFormData(files: File[]): FormData {
  const body = new FormData()
  files.forEach((file) => body.append('documents', file))
  return body
}
