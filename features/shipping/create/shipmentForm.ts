import { format } from 'date-fns'
import { EMPTY_PHONE } from '@/components/phone-field/PhoneField'
import { cmTo, convertLength, convertWeight, kgTo } from '@/features/procurement/shared/units'
import type { DimensionUnit, ShippingProduct, WeightUnit } from '../types'
import type { ShipmentFormValues } from './shipmentSchema'

/** Address Info › Shipment Info › Rates › Booking (the order flow has no Address step). */
export type WizardStep = 0 | 1 | 2 | 3

export type UnitSystem = ShipmentFormValues['units']
export const UNITS: Record<UnitSystem, { length: DimensionUnit; weight: WeightUnit }> = {
  METRIC: { length: 'CM', weight: 'KG' },
  IMPERIAL: { length: 'IN', weight: 'LB' },
}

export type ShipToValues = ShipmentFormValues['shipTo']
export type ProductLine = ShipmentFormValues['products'][number]
export type CustomsValues = ProductLine['customs']

export type PackageField = 'length' | 'width' | 'height' | 'weight'
export const PACKAGE_FIELDS: PackageField[] = ['length', 'width', 'height', 'weight']

/** Countries goods are shipped from for now; the origin picker offers only these, Canada first. */
export const ORIGIN_COUNTRIES = [
  { code: 'CA', name: 'Canada' },
  { code: 'US', name: 'United States' },
] as const
export const DEFAULT_ORIGIN = 'CA'
const isOrigin = (code: string | null | undefined): code is string => ORIGIN_COUNTRIES.some((country) => country.code === code)

export const EMPTY_SHIP_TO: ShipToValues = {
  name: '',
  company: '',
  address1: '',
  address2: '',
  email: '',
  address: { country: '', province: '', city: '', postalCode: '' },
  phone: EMPTY_PHONE,
  residential: true,
}

/**
 * A blank shipment. Everything ships by pickup (no drop-off), so it starts with today's date, the earliest the
 * picker allows; built per form so the date is never a stale one from an old page load. Duties default to DDP:
 * marketplace buyers aren't asked to pay at the door, and the carriers bill our wallet.
 */
export const newShipmentValues = (): ShipmentFormValues => ({
  shipFromId: '',
  shipTo: EMPTY_SHIP_TO,
  products: [],
  units: 'METRIC',
  pkg: { length: '', width: '', height: '', weight: '' },
  incoterm: 'DDP',
  pickupDate: format(new Date(), 'yyyy-MM-dd'),
  signature: false,
  insurance: '',
  reference: '',
})

/** A typed number, or null when blank or not a number. */
export const numberOf = (value: string): number | null => {
  const parsed = Number(value)
  return value.trim() === '' || !Number.isFinite(parsed) ? null : parsed
}

const text = (value: number | null) => (value === null ? '' : String(value))

/**
 * What the picked products say the package is, in the given units: dimensions of the first product,
 * weight = Σ unit weight × quantity (null when any product has no weight).
 */
export function derivePackage(products: ProductLine[], units: UnitSystem): Record<PackageField, number | null> {
  const first = products[0]?.product
  const { length: lengthUnit, weight: weightUnit } = UNITS[units]
  const dim = (cm: number | null | undefined) => (cm === null || cm === undefined ? null : cmTo(cm, lengthUnit))
  const known = products.length > 0 && products.every((item) => item.product.weight !== null)
  const kg = known ? products.reduce((sum, item) => sum + (item.product.weight ?? 0) * (numberOf(item.quantity) ?? 0), 0) : null
  return { length: dim(first?.length), width: dim(first?.width), height: dim(first?.height), weight: kg === null ? null : kgTo(kg, weightUnit) }
}

/** The derived package as the form's strings. */
export const packageText = (products: ProductLine[], units: UnitSystem): Record<PackageField, string> => {
  const derived = derivePackage(products, units)
  return { length: text(derived.length), width: text(derived.width), height: text(derived.height), weight: text(derived.weight) }
}

/** A typed package value moved to the other unit system. */
export function convertPackageValue(field: PackageField, value: string, from: UnitSystem, to: UnitSystem): string {
  const parsed = numberOf(value)
  if (parsed === null) return value
  return String(field === 'weight' ? convertWeight(parsed, UNITS[from].weight, UNITS[to].weight) : convertLength(parsed, UNITS[from].length, UNITS[to].length))
}

/**
 * A channel-order SKU not mapped to one of our products stands in as a product with a negative id and no data.
 * Booking waits until it is mapped, so it is never sent as a parcel line.
 */
export const isUnmapped = (product: ShippingProduct) => product.id < 0

/** A customs line prefilled from the product: its own HS code, else the last booked, else its category's; origin Canada unless the USA is on record. */
export const customsFromProduct = (product: ShippingProduct): CustomsValues => ({
  description: product.description || [product.name, product.variantName].filter(Boolean).join(' — '),
  unitValue: text(product.unitValue),
  currency: product.currency ?? 'USD',
  hsCode: product.hsCode ?? '',
  originCountry: isOrigin(product.originCountry) ? product.originCountry : DEFAULT_ORIGIN,
})

/** A product row as the form holds it: the product, its quantity as typed, and its customs line. */
export const productLine = (product: ShippingProduct, quantity = '1'): ProductLine => ({ product, quantity, customs: customsFromProduct(product) })

/** A customs value still as the product supplied it (grey "from product" fill). */
export function isFromProduct(product: ShippingProduct, line: CustomsValues, field: keyof CustomsValues): boolean {
  switch (field) {
    case 'description':
      return Boolean(product.description) && line.description === product.description
    case 'unitValue':
      return product.unitValue !== null && numberOf(line.unitValue) === product.unitValue
    case 'hsCode':
      return Boolean(product.hsCode) && line.hsCode === product.hsCode
    case 'originCountry':
      return Boolean(product.originCountry) && line.originCountry === product.originCountry
    case 'currency':
      return product.currency !== null && line.currency === product.currency
  }
}
