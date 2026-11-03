import { z } from 'zod'
import type { CategoryRef, LengthUnit, PoProduct, PoProductFamily, ProductBody, VariationBody, WeightUnit } from '@/services/api/procurement.api'
import { cbmOf, cmTo, convertLength, kgTo } from '../shared/units'

/* ─────────────── Field helpers ─────────────── */

const SKU = /^[A-Z0-9][A-Z0-9._\-/]*$/

const optionalNumber = (label: string) =>
  z.string().trim().refine((value) => value === '' || (Number.isFinite(Number(value)) && Number(value) > 0), `${label} must be a number above 0`)

export const nameField = z.string().trim().min(1, 'Name is required').max(150, 'Name is too long')

/** SKU is optional; when given it must be well formed (the server checks it is unique). */
export const skuField = z
  .string()
  .trim()
  .max(64, 'SKU is too long')
  .refine((value) => value === '' || SKU.test(value.toUpperCase()), 'Use letters, digits and . _ - / only')

const weightShape = { weight: optionalNumber('Weight') }

/** Customs tariff code: 6 to 12 digits, with or without dots, dashes or spaces (same rule as the server). Optional. */
export const hsCodeField = z
  .string()
  .trim()
  .max(20, 'HS code is too long')
  .refine((value) => {
    if (value === '') return true
    const digits = value.replace(/\D/g, '').length
    return /^[0-9][0-9.\-\s]*$/.test(value) && digits >= 6 && digits <= 12
  }, 'HS code is 6 to 12 digits, e.g. 6302.21.00')

/** `10x20x30`, `10 x 20 x 30`, `10×20×30` or `10*20*30` as [10, 20, 30]; null when blank or not three numbers above 0. */
export function parseDimensions(text: string): [number, number, number] | null {
  const parts = text.trim().split(/\s*[x\u00d7*]\s*/i)
  if (parts.length !== 3) return null
  const numbers = parts.map((part) => (part === '' ? Number.NaN : Number(part)))
  return numbers.every((value) => Number.isFinite(value) && value > 0) ? (numbers as [number, number, number]) : null
}

export const formatDimensionsText = (length: number, width: number, height: number): string => `${length}x${width}x${height}`

/** The same text in the other unit (10x20x30 cm is 3.94x7.87x11.81 in); text that is not L x W x H stays as typed. */
export function convertDimensionsText(text: string, from: LengthUnit, to: LengthUnit): string {
  const dims = parseDimensions(text)
  return dims ? formatDimensionsText(...(dims.map((value) => convertLength(value, from, to)) as [number, number, number])) : text
}

/** One dimension box: blank, or three numbers (L x W x H) such as 10x20x30. */
const dimensionsText = z
  .string()
  .trim()
  .refine((value) => value === '' || parseDimensions(value) !== null, 'Enter three numbers like 10x20x30 (L x W x H)')

/** Variation dimensions as typed. `cbmTouched` = the user overrode the derived CBM. */
const dimensionShape = {
  /** The individually packed unit, L x W x H in the variation's own unit. */
  dimensions: dimensionsText,
  /** What the supplier states for the product, same format and unit. */
  supplierDimensions: dimensionsText,
  cbm: z.string().trim().refine((value) => value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0), 'CBM must be a number'),
  cbmTouched: z.boolean(),
}

/* ─────────────── Schema ─────────────── */

export const variationSchema = z.object({
  /** Stable row identity in the form (photos are keyed by it); never sent. */
  clientKey: z.string(),
  /** Saved variation id; absent for a new row. */
  id: z.number().optional(),
  /** Rebuilt from name, color and size whenever one of them changes (see useVariantNameSync); editable in between. */
  variantName: z.string().trim().max(200, 'Too long'),
  sku: skuField,
  color: z.string().trim().min(1, 'Color is required').max(60, 'Color is too long'),
  material: z.string().trim().max(120, 'Too long'),
  packaging: z.string().trim().max(120, 'Too long'),
  sizeName: z.string().trim().max(60, 'Too long'),
  /** Starts from the master's HS code (see useHsCodeSync) and may be changed per SKU. */
  hsCode: hsCodeField,
  description: z.string().trim().max(2000, 'Description is too long'),
  /** Optional barcode: UPC-A, or an 8/13/14-digit GTIN (same rule as the server). */
  upc: z
    .string()
    .trim()
    .refine((value) => value === '' || /^(\d{8}|\d{12,14})$/.test(value), 'UPC must be 8, 12, 13 or 14 digits'),
  /** Optional Amazon listing ID: 10 letters or digits (same rule as the server, which upper-cases it). */
  asin: z
    .string()
    .trim()
    .refine((value) => value === '' || /^[A-Za-z0-9]{10}$/.test(value), 'ASIN must be 10 letters or digits'),
  /** Optional stock level (units) at which to reorder; whole number. */
  reorderPoint: z
    .string()
    .trim()
    .refine((value) => value === '' || (/^\d+$/.test(value) && Number(value) <= 10_000_000), 'Enter a whole number of units'),
  ...weightShape,
  /** The unit this variation's weight is typed in (its own toggle). */
  weightUnit: z.enum(['KG', 'LB']),
  /** The unit this variation's L × W × H is typed in (its own toggle). */
  dimensionUnit: z.enum(['CM', 'IN']),
  ...dimensionShape,
  hasPhoto: z.boolean(),
  removePhoto: z.boolean(),
})

export const productFormSchema = z
  .object({
    name: nameField,
    sku: skuField,
    category: z.custom<CategoryRef | null>(),
    /** Default material for new variations; size, packaging and weight belong to each variation. */
    material: z.string().trim().max(120, 'Too long'),
    /** Default HS code for the variations. */
    hsCode: hsCodeField,
    description: z.string().trim().max(2000, 'Description is too long'),
    variations: z.array(variationSchema).max(100, 'At most 100 variations'),
    hasPhoto: z.boolean(),
    removePhoto: z.boolean(),
  })
  .superRefine((values, ctx) => {
    // The server checks other products; this catches a SKU typed twice in the same form
    const seen = new Set<string>()
    ;[{ sku: values.sku, path: ['sku'] }, ...values.variations.map((variation, index) => ({ sku: variation.sku, path: ['variations', index, 'sku'] }))].forEach(({ sku, path }) => {
      const key = sku.trim().toUpperCase()
      if (!key) return
      if (seen.has(key)) ctx.addIssue({ code: 'custom', path, message: 'Used twice in this product' })
      seen.add(key)
    })
  })

export type ProductFormValues = z.infer<typeof productFormSchema>
export type VariationFormValues = z.infer<typeof variationSchema>

/* ─────────────── Defaults ─────────────── */

const blankDimensions = { dimensions: '', supplierDimensions: '', cbm: '', cbmTouched: false }

export const emptyProductValues: ProductFormValues = {
  name: '',
  sku: '',
  category: null,
  material: '',
  hsCode: '',
  description: '',
  variations: [],
  hasPhoto: false,
  removePhoto: false,
}

/** A new variation row: the master's material as a default, and the units of the row above it (else KG and CM). */
export function newVariation(
  master: Pick<ProductFormValues, 'material' | 'hsCode'>,
  units: Pick<VariationFormValues, 'weightUnit' | 'dimensionUnit'> = { weightUnit: 'KG', dimensionUnit: 'CM' }
): VariationFormValues {
  return {
    clientKey: crypto.randomUUID(),
    variantName: '',
    sku: '',
    color: '',
    material: master.material,
    packaging: '',
    sizeName: '',
    // A new variation starts from the master's HS code
    hsCode: master.hsCode,
    description: '',
    upc: '',
    asin: '',
    reorderPoint: '',
    weight: '',
    weightUnit: units.weightUnit,
    dimensionUnit: units.dimensionUnit,
    ...blankDimensions,
    hasPhoto: false,
    removePhoto: false,
  }
}

/* ─────────────── Derived values ─────────────── */

/** `Folding Side Table-Black-Medium`, built the same way the server builds it. */
export const variantNameOf = (name: string, color: string, sizeName: string): string =>
  [name, color, sizeName].map((part) => part.trim()).filter(Boolean).join('-')

/** The variant name to send: only a name that differs from the auto-built one counts as typed. */
const customVariantName = (variation: Pick<VariationFormValues, 'variantName' | 'color' | 'sizeName'>, masterName: string): string | null => {
  const typed = variation.variantName.trim()
  return typed && typed !== variantNameOf(masterName, variation.color, variation.sizeName) ? typed : null
}

/** The CBM to show: the user's override, else L×W×H in the current unit, else blank. */
export function derivedCbm(values: { dimensions: string; cbm: string; cbmTouched: boolean }, unit: LengthUnit): string {
  if (values.cbmTouched) return values.cbm
  const dims = parseDimensions(values.dimensions)
  return dims ? String(cbmOf(dims[0], dims[1], dims[2], unit)) : ''
}

/* ─────────────── API ⇄ form ─────────────── */

const num = (value: string): number | null => (value.trim() === '' ? null : Number(value))
const text = (value: string): string | null => (value.trim() === '' ? null : value.trim())
const shown = (value: number | null): string => (value === null ? '' : String(value))

function dimensionsBody(values: { dimensions: string; supplierDimensions: string; cbm: string; cbmTouched: boolean }, dimensionUnit: LengthUnit) {
  const own = parseDimensions(values.dimensions)
  const supplier = parseDimensions(values.supplierDimensions)
  return {
    length: own?.[0] ?? null,
    width: own?.[1] ?? null,
    height: own?.[2] ?? null,
    supplierLength: supplier?.[0] ?? null,
    supplierWidth: supplier?.[1] ?? null,
    supplierHeight: supplier?.[2] ?? null,
    dimensionUnit,
    cbm: num(derivedCbm(values, dimensionUnit)),
  }
}

export function toProductBody(values: ProductFormValues, expectedUpdatedAt?: string): ProductBody {
  const variations: VariationBody[] = values.variations.map((variation) => ({
    ...(variation.id !== undefined && { id: variation.id }),
    // Left as the auto-built name, it is not stored as custom, so it keeps following the master's name
    variantName: customVariantName(variation, values.name),
    sku: text(variation.sku)?.toUpperCase() ?? null,
    color: variation.color.trim(),
    material: text(variation.material),
    packaging: text(variation.packaging),
    sizeName: text(variation.sizeName),
    hsCode: text(variation.hsCode),
    description: text(variation.description),
    upc: text(variation.upc),
    asin: text(variation.asin),
    reorderPoint: num(variation.reorderPoint),
    // A variation always carries its own weight and units; the master has none to inherit
    inheritsMaster: false,
    weight: num(variation.weight),
    weightUnit: variation.weightUnit,
    ...dimensionsBody(variation, variation.dimensionUnit),
  }))
  return {
    name: values.name.trim(),
    sku: text(values.sku)?.toUpperCase() ?? null,
    categoryId: values.category?.id ?? null,
    color: null,
    material: text(values.material),
    packaging: null,
    sizeName: null,
    hsCode: text(values.hsCode),
    description: text(values.description),
    weight: null,
    weightUnit: 'KG',
    dimensionUnit: 'CM',
    variations,
    ...(expectedUpdatedAt && { expectedUpdatedAt }),
  }
}

const weightValue = (row: PoProduct, weightUnit: WeightUnit) => (row.weightKg === null ? '' : shown(kgTo(row.weightKg, weightUnit)))

/** Saved dimensions back in the unit they were entered in. A stored CBM that differs from L×W×H was an override. */
function dimensionValues(row: PoProduct, dimensionUnit: LengthUnit) {
  const asText = (l: number | null, w: number | null, h: number | null) =>
    l === null || w === null || h === null ? '' : formatDimensionsText(cmTo(l, dimensionUnit), cmTo(w, dimensionUnit), cmTo(h, dimensionUnit))
  const dimensions = asText(row.lengthCm, row.widthCm, row.heightCm)
  const supplierDimensions = asText(row.supplierLengthCm, row.supplierWidthCm, row.supplierHeightCm)
  const auto = derivedCbm({ dimensions, cbm: '', cbmTouched: false }, dimensionUnit)
  const cbm = shown(row.cbm)
  return {
    dimensions,
    supplierDimensions,
    cbm,
    cbmTouched: cbm !== '' && (auto === '' || Math.abs(Number(auto) - Number(cbm)) > 0.000001),
  }
}

/** Form values for an existing family. `asCopy` blanks ids and SKUs (Duplicate); the name stays, and the server asks for a new one on save. */
export function fromFamily(family: PoProductFamily, asCopy = false): ProductFormValues {
  return {
    name: family.name,
    sku: asCopy ? '' : (family.sku ?? ''),
    category: family.category,
    material: family.material ?? '',
    hsCode: family.hsCode ?? '',
    description: family.description ?? '',
    hasPhoto: !asCopy && family.hasPhoto,
    removePhoto: false,
    variations: family.variations.map((variation) => ({
      clientKey: crypto.randomUUID(),
      ...(asCopy ? {} : { id: variation.id }),
      variantName: variation.variantName ?? variantNameOf(family.name, variation.color ?? '', variation.sizeName ?? ''),
      sku: asCopy ? '' : (variation.sku ?? ''),
      color: variation.color ?? '',
      material: variation.material ?? '',
      packaging: variation.packaging ?? '',
      sizeName: variation.sizeName ?? '',
      hsCode: variation.hsCode ?? '',
      description: variation.description ?? '',
      // A barcode identifies one item, so a copy starts without it (as with the SKU)
      upc: asCopy ? '' : (variation.upc ?? ''),
      asin: asCopy ? '' : (variation.asin ?? ''),
      reorderPoint: variation.reorderPoint === null ? '' : String(variation.reorderPoint),
      // Variations that followed the master's weight were saved with a copy of it, so every row shows its own
      weight: weightValue(variation, variation.weightUnit),
      weightUnit: variation.weightUnit,
      dimensionUnit: variation.dimensionUnit,
      ...dimensionValues(variation, variation.dimensionUnit),
      hasPhoto: !asCopy && variation.hasPhoto,
      removePhoto: false,
    })),
  }
}
