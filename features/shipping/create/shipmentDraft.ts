import type { AddressValue } from '@/components/address-fields/AddressFields'
import { EMPTY_PHONE, type PhoneValue } from '@/components/phone-field/PhoneField'
import { cmTo, convertLength, convertWeight, kgTo } from '@/features/procurement/shared/units'
import type { CustomsCurrency, DimensionUnit, Handover, Incoterm, LabelFormat, ShippingProduct, WeightUnit } from '../types'

/** Address Info › Shipment Info › Rates › Booking */
export type WizardStep = 0 | 1 | 2 | 3

export type UnitSystem = 'METRIC' | 'IMPERIAL'
export const UNITS: Record<UnitSystem, { length: DimensionUnit; weight: WeightUnit }> = {
  METRIC: { length: 'CM', weight: 'KG' },
  IMPERIAL: { length: 'IN', weight: 'LB' },
}

export interface ShipToDraft {
  name: string
  company: string
  address1: string
  address2: string
  email: string
  address: AddressValue
  phone: PhoneValue
  residential: boolean
}

export interface PickedProduct {
  product: ShippingProduct
  /** As typed. */
  quantity: string
}

/** One customs line, one per picked product; its quantity is the product's. Values are as typed. */
export interface CustomsDraft {
  description: string
  unitValue: string
  currency: CustomsCurrency
  hsCode: string
  originCountry: string
}

export type PackageField = 'length' | 'width' | 'height' | 'weight'
export const PACKAGE_FIELDS: PackageField[] = ['length', 'width', 'height', 'weight']

export interface ShipmentOptions {
  incoterm: Incoterm
  handover: Handover
  /** yyyy-mm-dd */
  pickupDate: string
  signature: boolean
  /** CAD, as typed; blank for none. */
  insurance: string
  reference: string
}

export interface ShipmentDraft extends ShipmentOptions {
  step: WizardStep
  shipFromId: string
  shipTo: ShipToDraft
  products: PickedProduct[]
  /** By product id. */
  customs: Record<number, CustomsDraft>
  units: UnitSystem
  pkg: Record<PackageField, string>
  /** Package fields typed by hand: picking products no longer overwrites them. */
  pkgEdited: PackageField[]
  selectedRateId: string | null
  labelFormat: LabelFormat | null
  /** Bumped by every change to what is quoted; rates fetched for an older revision are stale. */
  revision: number
}

export const EMPTY_SHIP_TO: ShipToDraft = {
  name: '',
  company: '',
  address1: '',
  address2: '',
  email: '',
  address: { country: '', province: '', city: '', postalCode: '' },
  phone: EMPTY_PHONE,
  residential: true,
}

export const INITIAL_DRAFT: ShipmentDraft = {
  step: 0,
  shipFromId: '',
  shipTo: EMPTY_SHIP_TO,
  products: [],
  customs: {},
  units: 'METRIC',
  pkg: { length: '', width: '', height: '', weight: '' },
  pkgEdited: [],
  incoterm: 'DDP',
  handover: 'DROP_OFF',
  pickupDate: '',
  signature: false,
  insurance: '',
  reference: '',
  selectedRateId: null,
  labelFormat: null,
  revision: 0,
}

/** A typed number, or null when blank or not a number. */
export const numberOf = (value: string): number | null => {
  const parsed = Number(value)
  return value.trim() === '' || !Number.isFinite(parsed) ? null : parsed
}

const text = (value: number | null) => (value === null ? '' : String(value))

/**
 * What the picked products say the package is, in the current units: dimensions of the first product,
 * weight = Σ unit weight × quantity (null when any product has no weight).
 */
export function derivePackage(products: PickedProduct[], units: UnitSystem): Record<PackageField, number | null> {
  const first = products[0]?.product
  const { length: lengthUnit, weight: weightUnit } = UNITS[units]
  const dim = (cm: number | null | undefined) => (cm === null || cm === undefined ? null : cmTo(cm, lengthUnit))
  const known = products.length > 0 && products.every((item) => item.product.weight !== null)
  const kg = known ? products.reduce((sum, item) => sum + (item.product.weight ?? 0) * (numberOf(item.quantity) ?? 0), 0) : null
  return { length: dim(first?.length), width: dim(first?.width), height: dim(first?.height), weight: kg === null ? null : kgTo(kg, weightUnit) }
}

/** Refills the package fields not typed by hand from the products. */
function syncPackage(draft: ShipmentDraft): ShipmentDraft {
  const derived = derivePackage(draft.products, draft.units)
  const pkg = { ...draft.pkg }
  PACKAGE_FIELDS.forEach((field) => {
    if (!draft.pkgEdited.includes(field)) pkg[field] = text(derived[field])
  })
  return { ...draft, pkg }
}

/**
 * A channel-order SKU not mapped to one of our products stands in as a product with a negative id and no data,
 * so its customs line and the package are filled by hand like any missing value. It is sent without a productId.
 */
export const isUnmapped = (product: ShippingProduct) => product.id < 0

/** A customs line prefilled from the product master. */
export const customsFromProduct = (product: ShippingProduct): CustomsDraft => ({
  description: product.description || [product.name, product.variantName].filter(Boolean).join(' — '),
  unitValue: text(product.unitValue),
  currency: product.currency ?? 'USD',
  hsCode: product.hsCode ?? '',
  originCountry: product.originCountry ?? '',
})

export type DraftAction =
  | { type: 'goTo'; step: WizardStep }
  | { type: 'setShipFrom'; id: string }
  | { type: 'patchShipTo'; patch: Partial<ShipToDraft> }
  | { type: 'addProduct'; product: ShippingProduct }
  | { type: 'removeProduct'; productId: number }
  | { type: 'setQuantity'; productId: number; quantity: string }
  | { type: 'patchCustoms'; productId: number; patch: Partial<CustomsDraft> }
  | { type: 'setPackage'; field: PackageField; value: string }
  | { type: 'setUnits'; units: UnitSystem }
  | { type: 'patchOptions'; patch: Partial<ShipmentOptions> }
  | { type: 'selectRate'; rateId: string | null }
  | { type: 'setLabelFormat'; format: LabelFormat }
  | { type: 'reset' }
  /** Start from a prefilled draft (a channel order); empty package fields are filled from its products. */
  | { type: 'load'; draft: ShipmentDraft }

/** Changes to what is quoted. */
function edit(draft: ShipmentDraft, action: DraftAction): ShipmentDraft {
  switch (action.type) {
    case 'setShipFrom':
      return { ...draft, shipFromId: action.id }
    case 'patchShipTo': {
      const shipTo = { ...draft.shipTo, ...action.patch }
      const country = shipTo.address.country
      // The phone's calling code follows the ship-to country, unless the user picked another one for the phone
      if (country !== draft.shipTo.address.country && (!draft.shipTo.phone.country || draft.shipTo.phone.country === draft.shipTo.address.country)) {
        shipTo.phone = { ...shipTo.phone, country }
      }
      return { ...draft, shipTo }
    }
    case 'addProduct': {
      if (draft.products.some((item) => item.product.id === action.product.id)) return draft
      return syncPackage({
        ...draft,
        products: [...draft.products, { product: action.product, quantity: '1' }],
        customs: { ...draft.customs, [action.product.id]: customsFromProduct(action.product) },
      })
    }
    case 'removeProduct': {
      const { [action.productId]: _removed, ...customs } = draft.customs
      return syncPackage({ ...draft, products: draft.products.filter((item) => item.product.id !== action.productId), customs })
    }
    case 'setQuantity':
      return syncPackage({ ...draft, products: draft.products.map((item) => (item.product.id === action.productId ? { ...item, quantity: action.quantity } : item)) })
    case 'patchCustoms':
      return { ...draft, customs: { ...draft.customs, [action.productId]: { ...draft.customs[action.productId], ...action.patch } } }
    case 'setPackage':
      return { ...draft, pkg: { ...draft.pkg, [action.field]: action.value }, pkgEdited: draft.pkgEdited.includes(action.field) ? draft.pkgEdited : [...draft.pkgEdited, action.field] }
    case 'setUnits': {
      if (action.units === draft.units) return draft
      const from = UNITS[draft.units]
      const to = UNITS[action.units]
      const convert = (value: string, field: PackageField) => {
        const parsed = numberOf(value)
        if (parsed === null) return value
        return String(field === 'weight' ? convertWeight(parsed, from.weight, to.weight) : convertLength(parsed, from.length, to.length))
      }
      const pkg = { length: convert(draft.pkg.length, 'length'), width: convert(draft.pkg.width, 'width'), height: convert(draft.pkg.height, 'height'), weight: convert(draft.pkg.weight, 'weight') }
      return syncPackage({ ...draft, units: action.units, pkg })
    }
    case 'patchOptions':
      return { ...draft, ...action.patch }
    default:
      return draft
  }
}

export function draftReducer(draft: ShipmentDraft, action: DraftAction): ShipmentDraft {
  switch (action.type) {
    case 'goTo':
      return { ...draft, step: action.step }
    case 'selectRate':
      return { ...draft, selectedRateId: action.rateId }
    case 'setLabelFormat':
      return { ...draft, labelFormat: action.format }
    case 'reset':
      return INITIAL_DRAFT
    case 'load':
      return syncPackage({ ...action.draft, selectedRateId: null, revision: draft.revision + 1 })
    default: {
      const next = edit(draft, action)
      // Anything quoted changed: the rates on screen no longer apply
      return next === draft ? draft : { ...next, selectedRateId: null, revision: draft.revision + 1 }
    }
  }
}
