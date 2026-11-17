import { z } from 'zod'
import type { PoCurrency, PoDestination, PoProduct, PurchaseOrderBody, PurchaseOrderDetail, RemainingDraft, SupplierRef } from '@/services/api/procurement.api'
import type { LinkableSample } from '@/services/api/samples.api'

const wholeUnits = z
  .string()
  .trim()
  .refine((value) => /^\d+$/.test(value) && Number(value) >= 1, 'Enter at least 1 unit')
  .refine((value) => Number(value) <= 10_000_000, 'Too many units')

/** Rate as typed; a product needs one (checked with the form). */
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
})

/**
 * A row of the "Sample (Optional)" section: made on this form (no `id`), or an existing sample that is on the PO
 * already or linked to it now. `fixed` rows keep the values saved on the sample (a linked one, or one on a payment
 * request), so only new and PO-made samples are edited here.
 */
/** The few product details a sample row shows (a linked sample only carries these). */
export type SampleProduct = Pick<PoProduct, 'id' | 'ref' | 'name' | 'variantName'>

export const poSampleSchema = z.object({
  id: z.number().optional(),
  product: z.custom<SampleProduct>(),
  units: z.string().trim(),
  /** Paid samples have a unit rate; free ones have none. */
  paid: z.boolean(),
  unitPrice: z.string().trim(),
  fixed: z.boolean(),
  /** The PO a linked sample is on now (it moves here when saved). */
  fromPo: z.string().nullable().optional(),
})

export const poFormSchema = z
  .object({
    supplier: z.custom<SupplierRef | null>(),
    contactName: z.string().trim().max(150, 'Contact name is too long'),
    destination: z.enum(['US', 'CA']),
    /** The delivery warehouse's id as a string; empty = none. */
    warehouseId: z.string(),
    currency: z.enum(['USD', 'CAD']),
    etd: z.string().min(1, 'ERD is required'),
    lines: z.array(poLineSchema),
    samples: z.array(poSampleSchema),
  })
  .superRefine((values, ctx) => {
    if (!values.supplier) ctx.addIssue({ code: 'custom', path: ['supplier'], message: 'Supplier is required' })
    if (values.lines.length === 0) ctx.addIssue({ code: 'custom', path: ['lines'], message: 'Add at least one product; samples alone do not make a PO' })
    values.lines.forEach((line, index) => {
      if (line.unitPrice === '') ctx.addIssue({ code: 'custom', path: ['lines', index, 'unitPrice'], message: 'Enter a unit rate' })
      if (line.maxUnits !== undefined && Number(line.unitsOrdered) > line.maxUnits) {
        ctx.addIssue({ code: 'custom', path: ['lines', index, 'unitsOrdered'], message: `Only ${line.maxUnits} left` })
      }
    })
    values.samples.forEach((sample, index) => {
      if (sample.fixed) return
      if (!/^\d+$/.test(sample.units) || Number(sample.units) < 1) ctx.addIssue({ code: 'custom', path: ['samples', index, 'units'], message: 'Enter at least 1 unit' })
      else if (Number(sample.units) > 10_000_000) ctx.addIssue({ code: 'custom', path: ['samples', index, 'units'], message: 'Too many units' })
      if (sample.paid && !(Number(sample.unitPrice) > 0)) ctx.addIssue({ code: 'custom', path: ['samples', index, 'unitPrice'], message: 'Enter the sample price' })
    })
  })

export type PoFormValues = z.infer<typeof poFormSchema>
export type PoLineValues = z.infer<typeof poLineSchema>
export type PoSampleValues = z.infer<typeof poSampleSchema>

/** Units x rate rounded to cents; 0 until both are usable numbers. */
const amountOf = (units: number, rate: number): number => (Number.isFinite(units) && Number.isFinite(rate) ? Math.round(units * rate * 100) / 100 : 0)

export const lineAmount = (line: Pick<PoLineValues, 'unitsOrdered' | 'unitPrice'>): number => amountOf(Number(line.unitsOrdered), Number(line.unitPrice))

/** What a sample row adds to the PO: units x rate when paid, nothing when free. */
export const sampleAmount = (sample: Pick<PoSampleValues, 'units' | 'paid' | 'unitPrice'>): number => (sample.paid ? amountOf(Number(sample.units), Number(sample.unitPrice)) : 0)

export const emptyPoValues: PoFormValues = {
  supplier: null,
  contactName: '',
  destination: 'US',
  warehouseId: '',
  currency: 'USD',
  etd: '',
  lines: [],
  samples: [],
}

/** A fresh line for a picked product. */
export const newLine = (product: PoProduct): PoLineValues => ({ product, unitsOrdered: '', unitPrice: '', allocated: 0 })

/** A new sample of a picked product, free until it is marked paid. */
export const newSample = (product: PoProduct): PoSampleValues => ({ product, units: '', paid: false, unitPrice: '', fixed: false })

/** An existing sample picked in "Link existing sample": its saved values stay as they are. */
export const linkedSample = (sample: LinkableSample): PoSampleValues => ({
  id: sample.id,
  product: { id: sample.product.id, ref: sample.product.sku ?? `#${sample.product.id}`, name: sample.product.name, variantName: null },
  units: String(sample.units),
  paid: !sample.isFree,
  unitPrice: sample.isFree ? '' : String(sample.unitPrice),
  fixed: true,
  fromPo: sample.purchaseOrder?.poNo ?? null,
})

/** The PO's totals as typed: its products, and what its samples add to the amount. */
export function summarize(lines: PoLineValues[], samples: PoSampleValues[]) {
  const sum = <T>(rows: T[], pick: (row: T) => number) => rows.reduce((total, row) => total + pick(row), 0)
  const products = {
    count: lines.length,
    ordered: sum(lines, (line) => Number(line.unitsOrdered) || 0),
    allocated: sum(lines, (line) => line.allocated),
    amount: sum(lines, lineAmount),
  }
  const sampleTotals = { count: samples.length, free: samples.filter((sample) => !sample.paid).length, units: sum(samples, (sample) => Number(sample.units) || 0), amount: sum(samples, sampleAmount) }
  return { products, samples: sampleTotals, poAmount: Math.round((products.amount + sampleTotals.amount) * 100) / 100 }
}

const day = (value: string | null): string => (value ? value.slice(0, 10) : '')

export function toPoBody(values: PoFormValues, extras: { sourcePurchaseOrderId?: number; expectedUpdatedAt?: string; submit?: boolean } = {}): PurchaseOrderBody {
  return {
    supplierId: values.supplier!.id,
    contactName: values.contactName.trim() || null,
    destination: values.destination as PoDestination,
    warehouseId: values.warehouseId ? Number(values.warehouseId) : null,
    currency: values.currency as PoCurrency,
    etd: values.etd,
    lines: values.lines.map((line) => ({ productId: line.product.id, unitsOrdered: Number(line.unitsOrdered), unitPrice: Number(line.unitPrice) })),
    samples: values.samples.map((sample) => ({ ...(sample.id && { id: sample.id }), productId: sample.product.id, units: Number(sample.units), unitPrice: sample.paid ? Number(sample.unitPrice) : 0 })),
    ...(extras.sourcePurchaseOrderId && { sourcePurchaseOrderId: extras.sourcePurchaseOrderId }),
    ...(extras.expectedUpdatedAt && { expectedUpdatedAt: extras.expectedUpdatedAt }),
    submit: Boolean(extras.submit),
  }
}

/** A server issue's field as a form path; `samples.2.id` (a sample that cannot be linked) shows on that row's units. */
export function formPathOf(_values: PoFormValues, field: string): string {
  if (field === 'supplierId') return 'supplier'
  const line = field.match(/^lines\.(\d+)\.productId$/)
  if (line) return `lines.${line[1]}.unitsOrdered`
  const sample = field.match(/^samples\.(\d+)\.(\w+)$/)
  if (sample) return `samples.${sample[1]}.${sample[2] === 'id' || sample[2] === 'productId' ? 'units' : sample[2]}`
  return field
}

export function fromDetail(po: PurchaseOrderDetail): PoFormValues {
  return {
    supplier: po.supplier,
    contactName: po.contactName ?? '',
    destination: po.destination,
    warehouseId: po.warehouse ? String(po.warehouse.id) : '',
    currency: po.currency,
    etd: day(po.etd),
    lines: po.lines.map((line) => ({ product: line.product, unitsOrdered: String(line.unitsOrdered), unitPrice: line.unitPrice === null ? '' : String(line.unitPrice), allocated: line.allocated })),
    samples: po.samples.map((sample) => ({
      id: sample.id,
      product: sample.product,
      units: String(sample.units),
      paid: !sample.isFree,
      unitPrice: sample.isFree ? '' : String(sample.unitPrice),
      // Linked ones, and ones on a payment request, keep their saved values
      fixed: !sample.createdInPo || sample.locked,
    })),
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
    lines: draft.lines.map((line) => ({ product: line.product, unitsOrdered: String(line.unitsOrdered), unitPrice: line.unitPrice === null ? '' : String(line.unitPrice), allocated: 0, maxUnits: line.unitsOrdered })),
  }
}
