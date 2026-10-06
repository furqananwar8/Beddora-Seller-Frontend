import { z } from 'zod'
import type { CategoryRef, LengthUnit, PoProduct, PoProductFamily, ProductBody, VariationBody, WeightUnit } from '@/services/api/procurement.api'
import { cbmOf, cmTo, kgTo } from '../shared/units'

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

/** Shipping fields as typed. `cbmTouched` = the user overrode the derived CBM. */
const shippingShape = {
  weight: optionalNumber('Weight'),
  length: optionalNumber('Length'),
  width: optionalNumber('Width'),
  height: optionalNumber('Height'),
  cbm: z.string().trim().refine((value) => value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0), 'CBM must be a number'),
  cbmTouched: z.boolean(),
}

type Dimensions = { length: string; width: string; height: string }

/** All three of L, W and H, or none. */
function dimensionsTogether(values: Dimensions, ctx: z.RefinementCtx, prefix: (string | number)[] = []) {
  const given = [values.length, values.width, values.height].filter((part) => part.trim() !== '').length
  if (given === 0 || given === 3) return
  for (const key of ['length', 'width', 'height'] as const) {
    if (values[key].trim() === '') ctx.addIssue({ code: 'custom', path: [...prefix, key], message: 'Enter L, W and H together' })
  }
}

/* ─────────────── Schema ─────────────── */

export const variationSchema = z.object({
  /** Stable row identity in the form (photos are keyed by it); never sent. */
  clientKey: z.string(),
  /** Saved variation id; absent for a new row. */
  id: z.number().optional(),
  /** Typed by the user; blank means "build it from name, color and size". */
  variantName: z.string().trim().max(200, 'Too long'),
  sku: skuField,
  color: z.string().trim().min(1, 'Color is required').max(60, 'Color is too long'),
  material: z.string().trim().max(120, 'Too long'),
  packaging: z.string().trim().max(120, 'Too long'),
  sizeName: z.string().trim().max(60, 'Too long'),
  description: z.string().trim().max(2000, 'Description is too long'),
  inheritsMaster: z.boolean(),
  ...shippingShape,
  hasPhoto: z.boolean(),
  removePhoto: z.boolean(),
})

export const productFormSchema = z
  .object({
    name: nameField,
    sku: skuField,
    category: z.custom<CategoryRef | null>(),
    material: z.string().trim().max(120, 'Too long'),
    packaging: z.string().trim().max(120, 'Too long'),
    sizeName: z.string().trim().max(60, 'Too long'),
    description: z.string().trim().max(2000, 'Description is too long'),
    weightUnit: z.enum(['KG', 'LB']),
    dimensionUnit: z.enum(['CM', 'IN']),
    ...shippingShape,
    variations: z.array(variationSchema).max(100, 'At most 100 variations'),
    hasPhoto: z.boolean(),
    removePhoto: z.boolean(),
  })
  .superRefine((values, ctx) => {
    dimensionsTogether(values, ctx)
    values.variations.forEach((variation, index) => {
      if (!variation.inheritsMaster) dimensionsTogether(variation, ctx, ['variations', index])
    })
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

const blankShipping = { weight: '', length: '', width: '', height: '', cbm: '', cbmTouched: false }

export const emptyProductValues: ProductFormValues = {
  name: '',
  sku: '',
  category: null,
  material: '',
  packaging: '',
  sizeName: '',
  description: '',
  weightUnit: 'KG',
  dimensionUnit: 'CM',
  ...blankShipping,
  variations: [],
  hasPhoto: false,
  removePhoto: false,
}

/** A new variation row, prefilled from the master's defaults ("Same dims as master" on). */
export function newVariation(master: Pick<ProductFormValues, 'material' | 'packaging'>): VariationFormValues {
  return {
    clientKey: crypto.randomUUID(),
    variantName: '',
    sku: '',
    color: '',
    material: master.material,
    packaging: master.packaging,
    sizeName: '',
    description: '',
    inheritsMaster: true,
    ...blankShipping,
    hasPhoto: false,
    removePhoto: false,
  }
}

/* ─────────────── Derived values ─────────────── */

/** `Folding Side Table-Black-Medium`, built the same way the server builds it. */
export const variantNameOf = (name: string, color: string, sizeName: string): string =>
  [name, color, sizeName].map((part) => part.trim()).filter(Boolean).join('-')

/** What the variant name box shows: the typed name, else the auto-built one. */
export const shownVariantName = (variation: Pick<VariationFormValues, 'variantName' | 'color' | 'sizeName'>, masterName: string): string =>
  variation.variantName.trim() || variantNameOf(masterName, variation.color, variation.sizeName)

/** The variant name to send: only a name that differs from the auto-built one counts as typed. */
const customVariantName = (variation: Pick<VariationFormValues, 'variantName' | 'color' | 'sizeName'>, masterName: string): string | null => {
  const typed = variation.variantName.trim()
  return typed && typed !== variantNameOf(masterName, variation.color, variation.sizeName) ? typed : null
}

/** The CBM to show: the user's override, else L×W×H in the current unit, else blank. */
export function derivedCbm(values: Dimensions & { cbm: string; cbmTouched: boolean }, unit: LengthUnit): string {
  if (values.cbmTouched) return values.cbm
  const [l, w, h] = [values.length, values.width, values.height].map(Number)
  if (![values.length, values.width, values.height].every((part) => part.trim() !== '') || ![l, w, h].every((part) => part > 0)) return ''
  return String(cbmOf(l, w, h, unit))
}

/* ─────────────── API ⇄ form ─────────────── */

const num = (value: string): number | null => (value.trim() === '' ? null : Number(value))
const text = (value: string): string | null => (value.trim() === '' ? null : value.trim())
const shown = (value: number | null): string => (value === null ? '' : String(value))

function shippingBody(values: Dimensions & { weight: string; cbm: string; cbmTouched: boolean }, weightUnit: WeightUnit, dimensionUnit: LengthUnit) {
  const cbm = derivedCbm(values, dimensionUnit)
  return { weight: num(values.weight), weightUnit, length: num(values.length), width: num(values.width), height: num(values.height), dimensionUnit, cbm: num(cbm) }
}

export function toProductBody(values: ProductFormValues, expectedUpdatedAt?: string): ProductBody {
  const { weightUnit, dimensionUnit } = values
  const variations: VariationBody[] = values.variations.map((variation) => ({
    ...(variation.id !== undefined && { id: variation.id }),
    // Left as the auto-built name, it is not stored as custom, so it keeps following the master's name
    variantName: customVariantName(variation, values.name),
    sku: text(variation.sku)?.toUpperCase() ?? null,
    color: variation.color.trim(),
    material: text(variation.material),
    packaging: text(variation.packaging),
    sizeName: text(variation.sizeName),
    description: text(variation.description),
    inheritsMaster: variation.inheritsMaster,
    ...(variation.inheritsMaster
      ? { weight: null, weightUnit, length: null, width: null, height: null, dimensionUnit, cbm: null }
      : shippingBody(variation, weightUnit, dimensionUnit)),
  }))
  return {
    name: values.name.trim(),
    sku: text(values.sku)?.toUpperCase() ?? null,
    categoryId: values.category?.id ?? null,
    color: null,
    material: text(values.material),
    packaging: text(values.packaging),
    sizeName: text(values.sizeName),
    description: text(values.description),
    ...shippingBody(values, weightUnit, dimensionUnit),
    variations,
    ...(expectedUpdatedAt && { expectedUpdatedAt }),
  }
}

/** Saved measurements back in the units they were entered in. A stored CBM that differs from L×W×H was an override. */
function shippingValues(row: PoProduct, weightUnit: WeightUnit, dimensionUnit: LengthUnit) {
  const dims = {
    length: row.lengthCm === null ? '' : shown(cmTo(row.lengthCm, dimensionUnit)),
    width: row.widthCm === null ? '' : shown(cmTo(row.widthCm, dimensionUnit)),
    height: row.heightCm === null ? '' : shown(cmTo(row.heightCm, dimensionUnit)),
  }
  const auto = derivedCbm({ ...dims, cbm: '', cbmTouched: false }, dimensionUnit)
  const cbm = shown(row.cbm)
  return {
    weight: row.weightKg === null ? '' : shown(kgTo(row.weightKg, weightUnit)),
    ...dims,
    cbm,
    cbmTouched: cbm !== '' && (auto === '' || Math.abs(Number(auto) - Number(cbm)) > 0.000001),
  }
}

/** Form values for an existing family. `asCopy` blanks ids and SKUs (Duplicate); the name stays, and the server asks for a new one on save. */
export function fromFamily(family: PoProductFamily, asCopy = false): ProductFormValues {
  const { weightUnit, dimensionUnit } = family
  return {
    name: family.name,
    sku: asCopy ? '' : (family.sku ?? ''),
    category: family.category,
    material: family.material ?? '',
    packaging: family.packaging ?? '',
    sizeName: family.sizeName ?? '',
    description: family.description ?? '',
    weightUnit,
    dimensionUnit,
    ...shippingValues(family, weightUnit, dimensionUnit),
    hasPhoto: !asCopy && family.hasPhoto,
    removePhoto: false,
    variations: family.variations.map((variation) => ({
      clientKey: crypto.randomUUID(),
      ...(asCopy ? {} : { id: variation.id }),
      // A saved name that is just the auto-built one is not a typed name
      variantName: variation.variantName && variation.variantName !== variantNameOf(family.name, variation.color ?? '', variation.sizeName ?? '') ? variation.variantName : '',
      sku: asCopy ? '' : (variation.sku ?? ''),
      color: variation.color ?? '',
      material: variation.material ?? '',
      packaging: variation.packaging ?? '',
      sizeName: variation.sizeName ?? '',
      description: variation.description ?? '',
      inheritsMaster: variation.inheritsMaster,
      ...(variation.inheritsMaster ? blankShipping : shippingValues(variation, weightUnit, dimensionUnit)),
      hasPhoto: !asCopy && variation.hasPhoto,
      removePhoto: false,
    })),
  }
}
