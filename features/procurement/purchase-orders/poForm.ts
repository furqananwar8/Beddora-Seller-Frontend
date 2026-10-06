import { z } from 'zod'
import type { LengthUnit, PoCurrency, PoDestination, PoProduct, PurchaseOrderBody, PurchaseOrderDetail, RemainingDraft, SupplierRef } from '@/services/api/procurement.api'
import { cmTo } from '../shared/units'

const wholeUnits = z
  .string()
  .trim()
  .refine((value) => /^\d+$/.test(value) && Number(value) >= 1, 'Enter at least 1 unit')
  .refine((value) => Number(value) <= 10_000_000, 'Too many units')

const unitRate = z
  .string()
  .trim()
  .refine((value) => value !== '', 'Enter a unit rate')
  .refine((value) => value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0), 'Rate must be a number')

const optionalPositive = (label: string) => z.string().trim().refine((value) => value === '' || (Number.isFinite(Number(value)) && Number(value) > 0), `${label} must be above 0`)

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

export const poFormSchema = z
  .object({
    supplier: z.custom<SupplierRef | null>(),
    contactName: z.string().trim().max(150, 'Contact name is too long'),
    destination: z.enum(['US', 'CA']),
    currency: z.enum(['USD', 'CAD']),
    productionDate: z.string(),
    etd: z.string().min(1, 'ETD is required'),
    cartonLength: optionalPositive('Length'),
    cartonWidth: optionalPositive('Width'),
    cartonHeight: optionalPositive('Height'),
    cartonUnit: z.enum(['CM', 'IN']),
    masterCartons: z.string().trim().refine((value) => value === '' || (/^\d+$/.test(value) && Number(value) >= 1), 'Enter a whole number of cartons'),
    lines: z.array(poLineSchema).min(1, 'Add at least one product'),
  })
  .superRefine((values, ctx) => {
    if (!values.supplier) ctx.addIssue({ code: 'custom', path: ['supplier'], message: 'Supplier is required' })
    if (values.productionDate && values.etd && values.etd < values.productionDate) {
      ctx.addIssue({ code: 'custom', path: ['etd'], message: 'ETD must be on or after the production date' })
    }
    const carton = [values.cartonLength, values.cartonWidth, values.cartonHeight].filter((part) => part.trim() !== '').length
    if (carton !== 0 && carton !== 3) ctx.addIssue({ code: 'custom', path: ['cartonLength'], message: 'Enter carton L, W and H together' })
    values.lines.forEach((line, index) => {
      if (line.maxUnits !== undefined && Number(line.unitsOrdered) > line.maxUnits) {
        ctx.addIssue({ code: 'custom', path: ['lines', index, 'unitsOrdered'], message: `Only ${line.maxUnits} left` })
      }
    })
  })

export type PoFormValues = z.infer<typeof poFormSchema>
export type PoLineValues = z.infer<typeof poLineSchema>

/** Units x rate for a line as typed; 0 until both are usable numbers. */
export const lineAmount = (line: Pick<PoLineValues, 'unitsOrdered' | 'unitPrice'>): number => {
  const units = Number(line.unitsOrdered)
  const rate = Number(line.unitPrice)
  return Number.isFinite(units) && Number.isFinite(rate) ? Math.round(units * rate * 100) / 100 : 0
}

export const emptyPoValues: PoFormValues = {
  supplier: null,
  contactName: '',
  destination: 'US',
  currency: 'USD',
  productionDate: '',
  etd: '',
  cartonLength: '',
  cartonWidth: '',
  cartonHeight: '',
  cartonUnit: 'CM',
  masterCartons: '',
  lines: [],
}

const num = (value: string): number | null => (value.trim() === '' ? null : Number(value))
const day = (value: string | null): string => (value ? value.slice(0, 10) : '')
const shown = (value: number | null, unit: LengthUnit) => (value === null ? '' : String(cmTo(value, unit)))

export function toPoBody(values: PoFormValues, extras: { sourcePurchaseOrderId?: number; expectedUpdatedAt?: string } = {}): PurchaseOrderBody {
  return {
    supplierId: values.supplier!.id,
    contactName: values.contactName.trim() || null,
    destination: values.destination as PoDestination,
    currency: values.currency as PoCurrency,
    productionDate: values.productionDate || null,
    etd: values.etd,
    cartonLength: num(values.cartonLength),
    cartonWidth: num(values.cartonWidth),
    cartonHeight: num(values.cartonHeight),
    cartonUnit: values.cartonUnit,
    masterCartons: num(values.masterCartons),
    lines: values.lines.map((line) => ({ productId: line.product.id, unitsOrdered: Number(line.unitsOrdered), unitPrice: Number(line.unitPrice) })),
    ...(extras.sourcePurchaseOrderId && { sourcePurchaseOrderId: extras.sourcePurchaseOrderId }),
    ...(extras.expectedUpdatedAt && { expectedUpdatedAt: extras.expectedUpdatedAt }),
  }
}

export function fromDetail(po: PurchaseOrderDetail): PoFormValues {
  const unit = po.carton.unit
  return {
    supplier: po.supplier,
    contactName: po.contactName ?? '',
    destination: po.destination,
    currency: po.currency,
    productionDate: day(po.productionDate),
    etd: day(po.etd),
    cartonLength: shown(po.carton.lengthCm, unit),
    cartonWidth: shown(po.carton.widthCm, unit),
    cartonHeight: shown(po.carton.heightCm, unit),
    cartonUnit: unit,
    masterCartons: po.masterCartons === null ? '' : String(po.masterCartons),
    lines: po.lines.map((line) => ({ product: line.product, unitsOrdered: String(line.unitsOrdered), unitPrice: line.unitPrice === null ? '' : String(line.unitPrice), allocated: line.allocated })),
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
