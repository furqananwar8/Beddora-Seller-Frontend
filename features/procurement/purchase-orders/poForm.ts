import { z } from 'zod'
import type { PoCurrency, PoDestination, PoProduct, PurchaseOrderBody, PurchaseOrderDetail, RemainingDraft, SupplierRef } from '@/services/api/procurement.api'

const wholeUnits = z
  .string()
  .trim()
  .refine((value) => /^\d+$/.test(value) && Number(value) >= 1, 'Enter at least 1 unit')
  .refine((value) => Number(value) <= 10_000_000, 'Too many units')

/** Rate as typed; a product needs one (checked with the form), a sample may leave it empty for free. */
const unitRate = z
  .string()
  .trim()
  .refine((value) => value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0), 'Rate must be a number')

export const poLineSchema = z.object({
  product: z.custom<PoProduct>(),
  unitsOrdered: wholeUnits,
  /** Rate per unit as typed; the amount is units x rate. */
  unitPrice: unitRate,
  /** Units already in packaging lists (read-only here). */
  allocated: z.number(),
  /** From-remaining POs cannot take more than the source PO has left. */
  maxUnits: z.number().optional(),
  /** A sample, not a product of the PO: never packed or shipped, and outside the PO amount. */
  isSample: z.boolean(),
  /** A sample on a payment request: frozen. */
  locked: z.boolean().optional(),
})

export const poFormSchema = z
  .object({
    supplier: z.custom<SupplierRef | null>(),
    contactName: z.string().trim().max(150, 'Contact name is too long'),
    destination: z.enum(['US', 'CA']),
    currency: z.enum(['USD', 'CAD']),
    etd: z.string().min(1, 'ERD is required'),
    lines: z.array(poLineSchema),
  })
  .superRefine((values, ctx) => {
    if (!values.supplier) ctx.addIssue({ code: 'custom', path: ['supplier'], message: 'Supplier is required' })
    if (!values.lines.some((line) => !line.isSample)) ctx.addIssue({ code: 'custom', path: ['lines'], message: 'Add at least one product; samples alone do not make a PO' })
    values.lines.forEach((line, index) => {
      if (!line.isSample && line.unitPrice === '') ctx.addIssue({ code: 'custom', path: ['lines', index, 'unitPrice'], message: 'Enter a unit rate' })
      if (line.maxUnits !== undefined && Number(line.unitsOrdered) > line.maxUnits) {
        ctx.addIssue({ code: 'custom', path: ['lines', index, 'unitsOrdered'], message: `Only ${line.maxUnits} left` })
      }
    })
  })

export type PoFormValues = z.infer<typeof poFormSchema>
export type PoLineValues = z.infer<typeof poLineSchema>

/** Units x rate for a line as typed; 0 until both are usable numbers (an empty rate is 0, a free sample). */
export const lineAmount = (line: Pick<PoLineValues, 'unitsOrdered' | 'unitPrice'>): number => {
  const units = Number(line.unitsOrdered)
  const rate = Number(line.unitPrice)
  return Number.isFinite(units) && Number.isFinite(rate) ? Math.round(units * rate * 100) / 100 : 0
}

/** A sample with no rate (or 0) is free. */
export const isFreeLine = (line: Pick<PoLineValues, 'unitPrice'>): boolean => Number(line.unitPrice) === 0

export const emptyPoValues: PoFormValues = {
  supplier: null,
  contactName: '',
  destination: 'US',
  currency: 'USD',
  etd: '',
  lines: [],
}

/** A fresh line for a picked product: a product row until its Sample switch is turned on. */
export const newLine = (product: PoProduct, isSample = false): PoLineValues => ({ product, unitsOrdered: '', unitPrice: '', allocated: 0, isSample })

/** The form's lines split into what the PO orders and the samples sent with it, with their totals. */
export function summarize(lines: PoLineValues[]) {
  const products = lines.filter((line) => !line.isSample)
  const samples = lines.filter((line) => line.isSample)
  const sum = (rows: PoLineValues[], pick: (line: PoLineValues) => number) => rows.reduce((total, line) => total + pick(line), 0)
  return {
    products: { count: products.length, ordered: sum(products, (line) => Number(line.unitsOrdered) || 0), allocated: sum(products, (line) => line.allocated), amount: sum(products, lineAmount) },
    samples: { count: samples.length, free: samples.filter(isFreeLine).length, units: sum(samples, (line) => Number(line.unitsOrdered) || 0), amount: sum(samples, lineAmount) },
  }
}

const day = (value: string | null): string => (value ? value.slice(0, 10) : '')

export function toPoBody(values: PoFormValues, extras: { sourcePurchaseOrderId?: number; expectedUpdatedAt?: string; submit?: boolean } = {}): PurchaseOrderBody {
  return {
    supplierId: values.supplier!.id,
    contactName: values.contactName.trim() || null,
    destination: values.destination as PoDestination,
    currency: values.currency as PoCurrency,
    etd: values.etd,
    lines: values.lines.filter((line) => !line.isSample).map((line) => ({ productId: line.product.id, unitsOrdered: Number(line.unitsOrdered), unitPrice: Number(line.unitPrice) })),
    samples: values.lines.filter((line) => line.isSample).map((line) => ({ productId: line.product.id, units: Number(line.unitsOrdered), unitPrice: Number(line.unitPrice) || 0 })),
    ...(extras.sourcePurchaseOrderId && { sourcePurchaseOrderId: extras.sourcePurchaseOrderId }),
    ...(extras.expectedUpdatedAt && { expectedUpdatedAt: extras.expectedUpdatedAt }),
    submit: Boolean(extras.submit),
  }
}

/**
 * A server issue's field as a form path. The body lists products and samples apart while the form keeps one list,
 * so `samples.2.units` is the third sample row wherever it sits.
 */
export function formPathOf(values: PoFormValues, field: string): string {
  if (field === 'supplierId') return 'supplier'
  const line = field.match(/^lines\.(\d+)\.productId$/)
  if (line) return `lines.${formIndex(values, false, Number(line[1]))}.unitsOrdered`
  const sample = field.match(/^samples\.(\d+)\.(\w+)$/)
  if (sample) {
    const index = formIndex(values, true, Number(sample[1]))
    return `lines.${index}.${sample[2] === 'productId' || sample[2] === 'units' ? 'unitsOrdered' : sample[2]}`
  }
  return field
}

/** Where the n-th product (or sample) row sits in the form's single list. */
const formIndex = (values: PoFormValues, sample: boolean, nth: number): number => {
  let seen = -1
  return values.lines.findIndex((line) => line.isSample === sample && ++seen === nth)
}

export function fromDetail(po: PurchaseOrderDetail): PoFormValues {
  return {
    supplier: po.supplier,
    contactName: po.contactName ?? '',
    destination: po.destination,
    currency: po.currency,
    etd: day(po.etd),
    lines: [
      ...po.lines.map((line) => ({ product: line.product, unitsOrdered: String(line.unitsOrdered), unitPrice: line.unitPrice === null ? '' : String(line.unitPrice), allocated: line.allocated, isSample: false })),
      ...po.samples.map((sample) => ({ product: sample.product, unitsOrdered: String(sample.units), unitPrice: sample.isFree ? '' : String(sample.unitPrice), allocated: 0, isSample: true, locked: sample.locked })),
    ],
  }
}

/** A new PO prefilled with a closed PO's unallocated units, each capped at what is left. */
export function fromRemaining(draft: RemainingDraft): PoFormValues {
  return {
    ...emptyPoValues,
    supplier: draft.supplier,
    contactName: draft.contactName ?? '',
    destination: draft.destination,
    currency: draft.currency,
    lines: draft.lines.map((line) => ({ product: line.product, unitsOrdered: String(line.unitsOrdered), unitPrice: line.unitPrice === null ? '' : String(line.unitPrice), allocated: 0, maxUnits: line.unitsOrdered, isSample: false })),
  }
}
