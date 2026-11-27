import { z } from 'zod'
import { cmTo, convertLength } from '../shared/units'
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
  /** Every ordered unit is in a container (read-only, from the server). */
  shippedFully: z.boolean().optional(),
  /** From-remaining POs cannot take more than the source PO has left. */
  maxUnits: z.number().optional(),
  /** This batch's L × W × H for the product, as typed in the product's length unit; blank = none. Starts from the product's and never changes it. */
  length: z.string().trim(),
  width: z.string().trim(),
  height: z.string().trim(),
})

/** A batch of the PO: its own products. `id` is the saved batch (none on a new one). */
export const poBatchSchema = z.object({
  id: z.number().optional(),
  lines: z.array(poLineSchema),
  /** Saved batch on a packaging list: it cannot be removed. */
  locked: z.boolean().optional(),
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
    paymentTerms: z.string().trim().max(200, 'Payment terms are too long (200 characters max)'),
    destination: z.enum(['US', 'CA']),
    /** The brand the PO is for; its products are all of this platform. */
    platform: z.enum(['ECOMMERCE', 'RETAIL']),
    /** Payment terms as typed: the advance %, what the balance is due on, and the balance % (the two add up to 100). */
    advancePercent: z.string().trim(),
    balanceTerm: z.string().min(1),
    balancePercent: z.string().trim(),
    /** The delivery warehouse's id as a string; empty = none. */
    warehouseId: z.string(),
    currency: z.enum(['USD', 'CAD']),
    etd: z.string().min(1, 'ERD is required'),
    batches: z.array(poBatchSchema),
    samples: z.array(poSampleSchema),
  })
  .superRefine((values, ctx) => {
    if (!values.supplier) ctx.addIssue({ code: 'custom', path: ['supplier'], message: 'Supplier is required' })
    if (values.batches.every((batch) => batch.lines.length === 0)) ctx.addIssue({ code: 'custom', path: ['batches'], message: 'Add at least one product; samples alone do not make a PO' })
    const rates = new Map<number, string>()
    values.batches.forEach((batch, batchIndex) => {
      if (batch.lines.length === 0 && values.batches.length > 1) ctx.addIssue({ code: 'custom', path: ['batches', batchIndex, 'lines'], message: 'Add at least one product to this batch, or remove the batch' })
      batch.lines.forEach((line, index) => {
        const at = ['batches', batchIndex, 'lines', index]
        if (line.unitPrice === '') ctx.addIssue({ code: 'custom', path: [...at, 'unitPrice'], message: 'Enter a unit rate' })
        else if (rates.has(line.product.id) && Number(rates.get(line.product.id)) !== Number(line.unitPrice)) ctx.addIssue({ code: 'custom', path: [...at, 'unitPrice'], message: 'One rate per product: same as in the other batch' })
        rates.set(line.product.id, line.unitPrice)
        const typed = SIZE_PARTS.filter((part) => line[part] !== '')
        SIZE_PARTS.forEach((part) => {
          if (line[part] !== '' && !isSize(line[part])) ctx.addIssue({ code: 'custom', path: [...at, part], message: 'Must be a number above 0' })
        })
        if (typed.length > 0 && typed.length < 3) ctx.addIssue({ code: 'custom', path: [...at, SIZE_PARTS.find((part) => line[part] === '')!], message: 'Enter length, width and height' })
        if (line.maxUnits !== undefined && Number(line.unitsOrdered) > line.maxUnits) {
          ctx.addIssue({ code: 'custom', path: [...at, 'unitsOrdered'], message: `Only ${line.maxUnits} left` })
        }
      })
    })
    const advance = Number(values.advancePercent === '' ? 0 : values.advancePercent)
    const balance = Number(values.balancePercent === '' ? 0 : values.balancePercent)
    if (!Number.isFinite(advance) || advance < 0 || advance > 100) ctx.addIssue({ code: 'custom', path: ['advancePercent'], message: 'Advance must be between 0 and 100' })
    else if (!Number.isFinite(balance) || balance < 0 || balance > 100) ctx.addIssue({ code: 'custom', path: ['balancePercent'], message: 'Must be between 0 and 100' })
    else if (Math.round((advance + balance) * 100) !== 10000) ctx.addIssue({ code: 'custom', path: ['balancePercent'], message: 'The advance and the balance must add up to 100%' })
    values.samples.forEach((sample, index) => {
      if (sample.fixed) return
      if (!/^\d+$/.test(sample.units) || Number(sample.units) < 1) ctx.addIssue({ code: 'custom', path: ['samples', index, 'units'], message: 'Enter at least 1 unit' })
      else if (Number(sample.units) > 10_000_000) ctx.addIssue({ code: 'custom', path: ['samples', index, 'units'], message: 'Too many units' })
      if (sample.paid && !(Number(sample.unitPrice) > 0)) ctx.addIssue({ code: 'custom', path: ['samples', index, 'unitPrice'], message: 'Enter the sample price' })
    })
  })

/** The product's own L × W × H as typed text in its length unit. */
export const productSize = (product: Pick<PoProduct, 'lengthCm' | 'widthCm' | 'heightCm' | 'dimensionUnit'>) => {
  const shown = (cm: number | null) => (cm === null ? '' : String(cmTo(cm, product.dimensionUnit)))
  return { length: shown(product.lengthCm), width: shown(product.widthCm), height: shown(product.heightCm) }
}

const SIZE_PARTS = ['length', 'width', 'height'] as const
const isSize = (value: string) => Number.isFinite(Number(value)) && Number(value) > 0

export type PoFormValues = z.infer<typeof poFormSchema>
export type PoLineValues = z.infer<typeof poLineSchema>
export type PoBatchValues = z.infer<typeof poBatchSchema>

/** Every line of every batch, in order. */
export const allLines = (batches: PoBatchValues[]): PoLineValues[] => batches.flatMap((batch) => batch.lines)
export type PoSampleValues = z.infer<typeof poSampleSchema>

/** Units x rate rounded to cents; 0 until both are usable numbers. */
const amountOf = (units: number, rate: number): number => (Number.isFinite(units) && Number.isFinite(rate) ? Math.round(units * rate * 100) / 100 : 0)

export const lineAmount = (line: Pick<PoLineValues, 'unitsOrdered' | 'unitPrice'>): number => amountOf(Number(line.unitsOrdered), Number(line.unitPrice))

/** What a sample row adds to the PO: units x rate when paid, nothing when free. */
export const sampleAmount = (sample: Pick<PoSampleValues, 'units' | 'paid' | 'unitPrice'>): number => (sample.paid ? amountOf(Number(sample.units), Number(sample.unitPrice)) : 0)

export const emptyPoValues: PoFormValues = {
  supplier: null,
  contactName: '',
  paymentTerms: '',
  destination: 'US',
  platform: 'ECOMMERCE',
  advancePercent: '0',
  balanceTerm: 'Against B/L on sight',
  balancePercent: '100',
  warehouseId: '',
  currency: 'USD',
  etd: '',
  batches: [{ lines: [] }],
  samples: [],
}

/** A fresh line for a picked product. */
export const newLine = (product: PoProduct): PoLineValues => ({ product, unitsOrdered: '', unitPrice: '', allocated: 0, ...productSize(product) })

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
    // A SKU in two batches counts once
    count: new Set(lines.map((line) => line.product.id)).size,
    ordered: sum(lines, (line) => Number(line.unitsOrdered) || 0),
    allocated: sum(lines, (line) => line.allocated),
    amount: sum(lines, lineAmount),
  }
  const sampleTotals = { count: samples.length, free: samples.filter((sample) => !sample.paid).length, units: sum(samples, (sample) => Number(sample.units) || 0), amount: sum(samples, sampleAmount) }
  return { products, samples: sampleTotals, poAmount: Math.round((products.amount + sampleTotals.amount) * 100) / 100 }
}

const day = (value: string | null): string => (value ? value.slice(0, 10) : '')

/** The typed size in cm; null (follow the product) when blank or still the product's own. */
function sizeBody(line: PoLineValues): { lengthCm: number | null; widthCm: number | null; heightCm: number | null } {
  const own = productSize(line.product)
  const typed = SIZE_PARTS.map((part) => line[part])
  if (typed.every((value, index) => value === own[SIZE_PARTS[index]]) || typed.some((value) => value === '')) return { lengthCm: null, widthCm: null, heightCm: null }
  const [lengthCm, widthCm, heightCm] = typed.map((value) => convertLength(Number(value), line.product.dimensionUnit, 'CM'))
  return { lengthCm, widthCm, heightCm }
}

export function toPoBody(values: PoFormValues, extras: { sourcePurchaseOrderId?: number; expectedUpdatedAt?: string; submit?: boolean } = {}): PurchaseOrderBody {
  return {
    supplierId: values.supplier!.id,
    contactName: values.contactName.trim() || null,
    paymentTerms: values.paymentTerms.trim() || null,
    destination: values.destination as PoDestination,
    platform: values.platform,
    advancePercent: Number(values.advancePercent || 0),
    balanceTerm: values.balanceTerm,
    balancePercent: Number(values.balancePercent || 0),
    warehouseId: values.warehouseId ? Number(values.warehouseId) : null,
    currency: values.currency as PoCurrency,
    etd: values.etd,
    batches: values.batches.map((batch) => ({ ...(batch.id && { id: batch.id }), lines: batch.lines.map((line) => ({ productId: line.product.id, unitsOrdered: Number(line.unitsOrdered), unitPrice: Number(line.unitPrice), ...sizeBody(line) })) })),
    samples: values.samples.map((sample) => ({ ...(sample.id && { id: sample.id }), productId: sample.product.id, units: Number(sample.units), unitPrice: sample.paid ? Number(sample.unitPrice) : 0 })),
    ...(extras.sourcePurchaseOrderId && { sourcePurchaseOrderId: extras.sourcePurchaseOrderId }),
    ...(extras.expectedUpdatedAt && { expectedUpdatedAt: extras.expectedUpdatedAt }),
    submit: Boolean(extras.submit),
  }
}

/** A server issue's field as a form path; `samples.2.id` (a sample that cannot be linked) shows on that row's units. */
export function formPathOf(_values: PoFormValues, field: string): string {
  if (field === 'supplierId') return 'supplier'
  const line = field.match(/^batches\.(\d+)\.lines\.(\d+)\.productId$/)
  if (line) return `batches.${line[1]}.lines.${line[2]}.unitsOrdered`
  const sample = field.match(/^samples\.(\d+)\.(\w+)$/)
  if (sample) return `samples.${sample[1]}.${sample[2] === 'id' || sample[2] === 'productId' ? 'units' : sample[2]}`
  return field
}

/** A saved batch line's size: the one typed on the PO, else the product's. */
function savedSize(line: PurchaseOrderDetail['batches'][number]['lines'][number]) {
  if (line.lengthCm === null || line.widthCm === null || line.heightCm === null) return productSize(line.product)
  const unit = line.product.dimensionUnit
  return { length: String(cmTo(line.lengthCm, unit)), width: String(cmTo(line.widthCm, unit)), height: String(cmTo(line.heightCm, unit)) }
}

export function fromDetail(po: PurchaseOrderDetail): PoFormValues {
  return {
    supplier: po.supplier,
    contactName: po.contactName ?? '',
    paymentTerms: po.paymentTerms ?? '',
    destination: po.destination,
    platform: po.platform,
    advancePercent: String(po.advancePercent),
    balanceTerm: po.balanceTerm,
    balancePercent: String(po.balancePercent),
    warehouseId: po.warehouse ? String(po.warehouse.id) : '',
    currency: po.currency,
    etd: day(po.etd),
    batches: po.batches.map((batch) => ({
      id: batch.id,
      locked: batch.packagingList !== null,
      lines: batch.lines.map((line) => ({ product: line.product, unitsOrdered: String(line.units), unitPrice: line.unitPrice === null ? '' : String(line.unitPrice), allocated: line.packed, ...savedSize(line) })),
    })),
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
    platform: draft.platform,
    currency: draft.currency,
    batches: [{ lines: draft.lines.map((line) => ({ product: line.product, unitsOrdered: String(line.unitsOrdered), unitPrice: line.unitPrice === null ? '' : String(line.unitPrice), allocated: 0, maxUnits: line.unitsOrdered, ...productSize(line.product) })) }],
  }
}
