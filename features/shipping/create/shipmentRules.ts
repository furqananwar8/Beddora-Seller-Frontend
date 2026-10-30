import { isValidPhone, toInternational } from '@/components/phone-field/PhoneField'
import { kgTo } from '@/features/procurement/shared/units'
import type { SavedShipFromAddress } from '@/features/inventory/shipments/types'
import type { CustomsLine, ShipmentRequest, ShippingProduct } from '../types'
import { isUnmapped, numberOf, UNITS, type CustomsDraft, type PackageField, type ShipmentDraft } from './shipmentDraft'

/** Field → message. Keys: `name`, `phone`, `pkg.length`, `qty.12`, `customs.12.hsCode`… */
export type FieldErrors = Record<string, string>

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** 6–12 digits; dots allowed between them. */
const HS_CODE = /^\d[\d.]*\d$/
const hsDigits = (code: string) => code.replace(/\./g, '').length

export const isCrossBorder = (draft: ShipmentDraft, from: SavedShipFromAddress | undefined) =>
  Boolean(from && draft.shipTo.address.country && from.countryCode !== draft.shipTo.address.country)

/** Step 1. `needsProvince`: the ship-to country lists provinces / states. */
export function addressErrors(draft: ShipmentDraft, needsProvince: boolean): FieldErrors {
  const { shipTo } = draft
  const errors: FieldErrors = {}
  const required = (key: string, value: string, label: string) => {
    if (!value.trim()) errors[key] = `${label} is required`
  }
  if (!draft.shipFromId) errors.shipFrom = 'Pick the address to ship from'
  required('name', shipTo.name, 'Full name')
  required('address1', shipTo.address1, 'Address line 1')
  required('country', shipTo.address.country, 'Country')
  if (needsProvince) required('province', shipTo.address.province, 'State / province')
  required('city', shipTo.address.city, 'City')
  required('postalCode', shipTo.address.postalCode, 'Postal code')
  if (!shipTo.phone.number) errors.phone = 'Phone is required'
  else if (!isValidPhone(shipTo.phone)) errors.phone = 'Not a valid number for this country'
  if (shipTo.email && !EMAIL.test(shipTo.email)) errors.email = 'Not a valid email'
  return errors
}

const positive = (value: string) => {
  const parsed = numberOf(value)
  return parsed !== null && parsed > 0
}

/**
 * Every line needs a description and value (Stallion rates even domestic parcels from them). Cross-border lines also
 * need an HS code and origin, and US imports the full 10-digit HTS code (Stallion checks it against the US tariff).
 */
function customsErrors(productId: number, line: CustomsDraft, errors: FieldErrors, lane: { crossBorder: boolean; toUs: boolean }) {
  const key = (field: keyof CustomsDraft) => `customs.${productId}.${field}`
  if (!line.description.trim()) errors[key('description')] = 'Description is required'
  if (!positive(line.unitValue)) errors[key('unitValue')] = 'Unit value is required'
  const hsCode = line.hsCode.trim()
  if (hsCode && (!HS_CODE.test(hsCode) || hsDigits(hsCode) < 6 || hsDigits(hsCode) > 12)) errors[key('hsCode')] = '6–12 digits, dots allowed'
  if (!lane.crossBorder) return
  if (!hsCode) errors[key('hsCode')] = 'HS code is required'
  else if (lane.toUs && hsDigits(hsCode) !== 10) errors[key('hsCode')] = 'US shipments need the full 10-digit HTS code'
  if (!line.originCountry) errors[key('originCountry')] = 'Country of origin is required'
}

const PACKAGE_LABEL: Record<PackageField, string> = { length: 'Length', width: 'Width', height: 'Height', weight: 'Weight' }

/** Step 2. HS code and origin are only required cross-border; the products error is not a highlighted field. */
export function shipmentErrors(draft: ShipmentDraft, crossBorder: boolean): FieldErrors {
  const errors: FieldErrors = {}
  if (draft.products.length === 0) errors.products = 'Add at least one product'
  draft.products.forEach(({ product, quantity }) => {
    const parsed = numberOf(quantity)
    if (parsed === null || parsed < 1 || !Number.isInteger(parsed)) errors[`qty.${product.id}`] = 'Whole number, 1 or more'
  })
  ;(Object.keys(PACKAGE_LABEL) as PackageField[]).forEach((field) => {
    if (!positive(draft.pkg[field])) errors[`pkg.${field}`] = `${PACKAGE_LABEL[field]} is required`
  })
  const lane = { crossBorder, toUs: draft.shipTo.address.country === 'US' }
  draft.products.forEach(({ product }) => customsErrors(product.id, draft.customs[product.id], errors, lane))
  if (draft.handover === 'PICKUP' && !draft.pickupDate) errors.pickupDate = 'Pick the pickup date'
  if (draft.insurance && !positive(draft.insurance)) errors.insurance = 'Enter an amount above 0, or leave it blank'
  if (draft.reference.length > 50) errors.reference = '50 characters at most'
  return errors
}

/** Highlighted fields (everything but the "add a product" message). */
export const fieldCount = (errors: FieldErrors) => Object.keys(errors).filter((key) => key !== 'products').length

/** A prefilled customs value still as the product supplied it (grey "from product" fill). */
export function customsFromProductField(product: ShippingProduct, line: CustomsDraft, field: keyof CustomsDraft): boolean {
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

/** The draft as the rate request. Call once both steps are valid. */
export function toShipmentRequest(draft: ShipmentDraft, crossBorder: boolean): ShipmentRequest {
  const { shipTo } = draft
  const units = UNITS[draft.units]
  const blank = (value: string) => value.trim() || null
  const items: CustomsLine[] = draft.products.map(({ product, quantity }) => {
    const line = draft.customs[product.id]
    return {
      productId: isUnmapped(product) ? null : product.id,
      sku: product.sku,
      description: line.description.trim(),
      quantity: numberOf(quantity) ?? 1,
      unitValue: numberOf(line.unitValue) ?? 0,
      currency: line.currency,
      hsCode: line.hsCode.trim() || null,
      originCountry: line.originCountry || null,
      unitWeight: product.weight === null ? null : kgTo(product.weight, units.weight),
    }
  })
  return {
    shipFromAddressId: Number(draft.shipFromId),
    to: {
      name: shipTo.name.trim(),
      company: blank(shipTo.company),
      phone: toInternational(shipTo.phone),
      email: blank(shipTo.email),
      address1: shipTo.address1.trim(),
      address2: blank(shipTo.address2),
      city: shipTo.address.city,
      province: shipTo.address.province,
      postalCode: shipTo.address.postalCode.trim(),
      country: shipTo.address.country,
      residential: shipTo.residential,
    },
    packages: [
      {
        length: numberOf(draft.pkg.length) ?? 0,
        width: numberOf(draft.pkg.width) ?? 0,
        height: numberOf(draft.pkg.height) ?? 0,
        dimensionUnit: units.length,
        weight: numberOf(draft.pkg.weight) ?? 0,
        weightUnit: units.weight,
      },
    ],
    // Always sent: providers rate from the contents even domestically (HS code and origin may be empty then)
    items,
    incoterm: draft.incoterm,
    handover: draft.handover,
    pickupDate: draft.handover === 'PICKUP' ? draft.pickupDate : null,
    signature: draft.signature,
    insuranceAmount: numberOf(draft.insurance),
    reference: blank(draft.reference),
  }
}
