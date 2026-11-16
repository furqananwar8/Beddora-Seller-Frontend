import { z } from 'zod'
import type { CarrierShipment, GstRate, PaymentRequestDetail, PoRef, ReferenceType } from '@/services/api/finance.api'
import { formatCurrencyAmount, formatMoney } from '../shared/format'
import { splitGst, type GstInput } from '../shared/gst'

/** "12,450.50" -> 12450.5, NaN when it is not a number. */
export const parseAmount = (value: string): number => Number(value.replace(/,/g, '').trim())

/** Unparsable while typing counts as 0, so totals stay live. */
const amountOf = (value: string): number => (Number.isFinite(parseAmount(value)) ? parseAmount(value) : 0)

export const REFERENCE_OPTIONS: Array<{ value: ReferenceType; label: string }> = [
  { value: 'INVOICE', label: 'Invoice' },
  { value: 'PURCHASE_ORDER', label: 'Purchase order' },
  { value: 'SAMPLE', label: 'Sample' },
  { value: 'SHIPMENT', label: 'Shipment' },
]

/** What a batch can raise: samples are ticked from one PO's list, so they are raised one at a time. */
export const BATCH_REFERENCE_OPTIONS = REFERENCE_OPTIONS.filter((option) => option.value !== 'SAMPLE')

/** Types that pay against one of our purchase orders (a PO's own price, or the PO's samples), so they carry no invoice no. */
export const isPoBased = (referenceType: ReferenceType): boolean => referenceType === 'PURCHASE_ORDER' || referenceType === 'SAMPLE'

/** Same cap as the server. */
export const MAX_REQUEST_LINES = 20

/** One amount and the L4 cost center it is booked to. */
export const lineSchema = z.object({
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((value) => Number.isFinite(parseAmount(value)), 'Enter a valid amount')
    .refine((value) => parseAmount(value) > 0, 'Amount must be greater than zero'),
  costCenterId: z.string().min(1, 'Choose an expense'),
  /** The GST % (id of a rate in Settings > GST) this amount is worked out at; needed unless GST does not apply. */
  gstRateId: z.string(),
  /** The GST on this amount: worked out from the percentage, or typed in (`gstManual`). Empty when GST does not apply. */
  gstAmount: z.string().refine((value) => value === '' || (Number.isFinite(parseAmount(value)) && parseAmount(value) >= 0), 'Enter a valid GST amount'),
  /** True once the GST was typed in; changing the amount, percentage or GST type goes back to working it out. */
  gstManual: z.boolean(),
})

export type RequestLineValues = z.infer<typeof lineSchema>

export const emptyLine: RequestLineValues = { amount: '', costCenterId: '', gstRateId: '', gstAmount: '', gstManual: false }

export const baseSchema = z.object({
  partnerId: z.string().min(1, 'Choose a partner'),
  /** Paying a supplier invoice, one of our purchase orders (then there is no invoice no.), or a carrier's invoice for shipments. */
  referenceType: z.enum(['INVOICE', 'PURCHASE_ORDER', 'SHIPMENT', 'SAMPLE']),
  invoiceNo: z.string().trim().max(80, 'Keep it under 80 characters'),
  purchaseOrder: z.custom<PoRef | null>(),
  /** Shipment requests: the carrier's FBA shipments the invoice is for. */
  shipments: z.custom<CarrierShipment[]>(),
  /** Sample requests: the ticked chargeable samples of the picked PO. */
  sampleIds: z.array(z.number()),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  /** yyyy-MM-dd; starts as the invoice date plus the partner's payment term, and may be changed for this request alone. */
  dueDate: z.string(),
  /** Picked from the container listing; it then sets the destination (unless a PO already did). */
  containerNo: z.string().trim().max(60, 'Keep it under 60 characters'),
  marketplaceId: z.string(),
  currency: z.string().min(1, 'Choose a currency'),
  /** Whether the amounts entered include GST, exclude it, or none applies; each amount then picks its own rate. */
  gstType: z.enum(['INCLUSIVE', 'EXCLUSIVE', 'NOT_APPLICABLE']),
  /** One or more amounts; on a purchase-order request their total is capped at what the PO has left. */
  lines: z.array(lineSchema).min(1, 'Add an amount').max(MAX_REQUEST_LINES, `Up to ${MAX_REQUEST_LINES} amounts`),
  remarks: z.string().trim().max(1000, 'Keep it under 1000 characters'),
})

export type PaymentRequestFormValues = z.infer<typeof baseSchema>

/** The total of a request's lines. */
export const requestTotal = (lines: Array<Pick<RequestLineValues, 'amount'>>): number =>
  Math.round(lines.reduce((sum, line) => sum + amountOf(line.amount), 0) * 100) / 100

/** The amounts entered with the percentage picked for each (null when GST does not apply or none is picked yet). */
export const gstInputsOf = (values: Pick<PaymentRequestFormValues, 'gstType'> & { lines: RequestLineValues[] }, rates: GstRate[]): GstInput[] =>
  values.lines.map((line) => ({
    amount: amountOf(line.amount),
    rate: values.gstType === 'NOT_APPLICABLE' ? null : (rates.find((rate) => String(rate.id) === line.gstRateId)?.rate ?? null),
    gstAmount: values.gstType !== 'NOT_APPLICABLE' && line.gstManual ? amountOf(line.gstAmount) : null,
  }))

/** The GST a line works out to from its percentage alone (what its GST field shows until it is typed over); '' when there is nothing to show. */
export const autoGstText = (amount: string, rate: number | null, type: PaymentRequestFormValues['gstType']): string =>
  type === 'NOT_APPLICABLE' || amountOf(amount) <= 0 ? '' : formatMoney(splitGst([{ amount: amountOf(amount), rate }], type).gst)

/** The amounts entered split into the amount before GST (what limits and cost analysis use), the GST, and the total paid. */
export const gstSplitOf = (values: Pick<PaymentRequestFormValues, 'gstType'> & { lines: RequestLineValues[] }, rates: GstRate[]) => splitGst(gstInputsOf(values, rates), values.gstType)

/** What the picked purchase order still takes; a PO request may not ask for more. */
export interface PoLimit {
  currency: string
  amount: number
  leftToRequest: number
}

type ReferenceFields = Pick<PaymentRequestFormValues, 'referenceType' | 'invoiceNo' | 'purchaseOrder' | 'shipments' | 'invoiceDate' | 'dueDate' | 'gstType' | 'lines'> & { sampleIds?: number[] }

/** What every request needs to name what it pays, whether raised alone or in a batch (`path` places the issues inside a list). */
export function addReferenceIssues(values: ReferenceFields, ctx: z.RefinementCtx, path: Array<string | number> = []) {
  const isPo = isPoBased(values.referenceType)
  // Both are yyyy-MM-dd, so they compare as text
  if (values.dueDate && values.invoiceDate && values.dueDate < values.invoiceDate) ctx.addIssue({ code: 'custom', path: [...path, 'dueDate'], message: 'Due date cannot be before the invoice date' })
  if (!isPo && !values.invoiceNo.trim()) ctx.addIssue({ code: 'custom', path: [...path, 'invoiceNo'], message: 'Invoice number is required' })
  if (isPo && !values.purchaseOrder) ctx.addIssue({ code: 'custom', path: [...path, 'purchaseOrder'], message: 'Pick the purchase order being paid' })
  if (values.referenceType === 'SHIPMENT' && values.shipments.length === 0) ctx.addIssue({ code: 'custom', path: [...path, 'shipments'], message: 'Pick at least one shipment' })
  if (values.referenceType === 'SAMPLE' && !values.sampleIds?.length) ctx.addIssue({ code: 'custom', path: [...path, 'sampleIds'], message: 'Pick at least one sample' })
  if (values.gstType !== 'NOT_APPLICABLE') {
    values.lines.forEach((line, index) => {
      if (!line.gstRateId) ctx.addIssue({ code: 'custom', path: [...path, 'lines', index, 'gstRateId'], message: 'Choose a GST %' })
      if (values.gstType === 'INCLUSIVE' && line.gstManual && amountOf(line.gstAmount) > amountOf(line.amount)) {
        ctx.addIssue({ code: 'custom', path: [...path, 'lines', index, 'gstAmount'], message: 'GST cannot be more than the amount' })
      }
    })
  }
}

/** Schema depends on the picked PO: its open balance caps the request's amount before GST (the GST rates tell what that is). */
export const makePaymentRequestSchema = (poLimit: PoLimit | null, gstRates: GstRate[] = [], sampleTotal: number | null = null) =>
  baseSchema.superRefine((values, ctx) => {
    addReferenceIssues(values, ctx)
    // A sample request pays exactly the ticked samples, so its amounts (before GST) must add up to them
    if (values.referenceType === 'SAMPLE' && sampleTotal !== null && sampleTotal > 0 && Math.abs(gstSplitOf(values, gstRates).net - sampleTotal) >= 0.005) {
      ctx.addIssue({ code: 'custom', path: ['lines'], message: `The amounts must add up to ${formatMoney(sampleTotal)}, the ticked samples` })
    }
    if (values.referenceType === 'PURCHASE_ORDER' && poLimit && gstSplitOf(values, gstRates).net > poLimit.leftToRequest) {
      ctx.addIssue({ code: 'custom', path: ['lines'], message: poLimitMessage(poLimit) })
    }
  })

export const poLimitMessage = ({ currency, amount, leftToRequest }: PoLimit): string =>
  `The PO is worth ${formatCurrencyAmount(currency, amount)}; at most ${formatCurrencyAmount(currency, leftToRequest)} is left to request`

export const emptyFormValues: PaymentRequestFormValues = {
  partnerId: '',
  referenceType: 'INVOICE',
  invoiceNo: '',
  purchaseOrder: null,
  shipments: [],
  sampleIds: [],
  invoiceDate: '',
  dueDate: '',
  containerNo: '',
  marketplaceId: '',
  currency: '',
  gstType: 'NOT_APPLICABLE',
  lines: [emptyLine],
  remarks: '',
}

/** The lines as they were entered: an inclusive request's amounts held their GST. */
export const linesFromDetail = (detail: PaymentRequestDetail): RequestLineValues[] =>
  detail.lines.length
    ? detail.lines.map((line) => {
        const amount = formatMoney(detail.gstType === 'INCLUSIVE' ? line.amount + line.gstAmount : line.amount)
        // A stored GST that differs from what its percentage gives was typed in, and stays as it was
        const auto = autoGstText(amount, line.gstRate, detail.gstType)
        const stored = detail.gstType === 'NOT_APPLICABLE' ? '' : formatMoney(line.gstAmount)
        return { amount, costCenterId: line.costCenter ? String(line.costCenter.id) : '', gstRateId: line.gstRateId ? String(line.gstRateId) : '', gstAmount: stored, gstManual: stored !== auto }
      })
    : [emptyLine]

const isPo = (values: PaymentRequestFormValues) => isPoBased(values.referenceType)

/** The sample ids a request sends: its ticked samples on a sample request, none otherwise. */
const sampleIdsOf = (values: PaymentRequestFormValues): number[] => (values.referenceType === 'SAMPLE' ? values.sampleIds : [])

/** The shipment ids a request sends: its picked shipments on a shipment request, none otherwise. */
const shipmentIdsOf = (values: PaymentRequestFormValues): number[] => (values.referenceType === 'SHIPMENT' ? values.shipments.map((shipment) => shipment.id) : [])

const linesBody = (values: PaymentRequestFormValues) =>
  values.lines.map((line) => ({
    costCenterId: Number(line.costCenterId),
    amount: parseAmount(line.amount),
    gstRateId: values.gstType === 'NOT_APPLICABLE' || !line.gstRateId ? null : Number(line.gstRateId),
    // Only a GST that was typed in is sent; otherwise the server works it out from the percentage
    ...(values.gstType !== 'NOT_APPLICABLE' && line.gstManual ? { gstAmount: parseAmount(line.gstAmount) || 0 } : {}),
  }))

/** JSON body for PATCH, shared by edit and the save-after-create retry path. */
export function toUpdateBody(values: PaymentRequestFormValues) {
  return {
    partnerId: Number(values.partnerId),
    referenceType: values.referenceType,
    invoiceNo: isPo(values) ? null : values.invoiceNo.trim(),
    purchaseOrderId: isPo(values) ? (values.purchaseOrder?.id ?? null) : null,
    shipmentIds: shipmentIdsOf(values),
    sampleIds: sampleIdsOf(values),
    invoiceDate: values.invoiceDate,
    dueDate: values.dueDate || null,
    containerNo: values.containerNo.trim() || null,
    marketplaceId: values.marketplaceId ? Number(values.marketplaceId) : null,
    currency: values.currency,
    gstType: values.gstType,
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
  if (values.referenceType === 'SHIPMENT') body.append('shipmentIds', JSON.stringify(shipmentIdsOf(values)))
  if (values.referenceType === 'SAMPLE') body.append('sampleIds', JSON.stringify(sampleIdsOf(values)))
  if (values.containerNo.trim()) body.append('containerNo', values.containerNo.trim())
  body.append('invoiceDate', values.invoiceDate)
  // Left out, the server uses the invoice date plus the partner's payment term
  if (values.dueDate) body.append('dueDate', values.dueDate)
  if (values.marketplaceId) body.append('marketplaceId', values.marketplaceId)
  body.append('currency', values.currency)
  body.append('gstType', values.gstType)
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
