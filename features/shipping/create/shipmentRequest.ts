import type { FieldErrors } from 'react-hook-form'
import { toInternational } from '@/components/phone-field/PhoneField'
import { kgTo } from '@/features/procurement/shared/units'
import type { CustomsLine, ShipFromOption, ShipmentRequest } from '../types'
import { numberOf, UNITS } from './shipmentForm'
import type { ShipmentFormValues } from './shipmentSchema'

export const isCrossBorder = (values: Pick<ShipmentFormValues, 'shipTo'>, from: ShipFromOption | undefined) =>
  Boolean(from && values.shipTo.address.country && from.countryCode !== values.shipTo.address.country)

/** How many fields carry an error, at any depth. */
export function countErrors(errors: FieldErrors | undefined): number {
  if (!errors) return 0
  return Object.values(errors).reduce<number>((sum, node) => {
    if (!node || typeof node !== 'object') return sum
    if ('message' in node && typeof node.message === 'string') return sum + 1
    return sum + countErrors(node as FieldErrors)
  }, 0)
}

const FIELD_LABEL: Record<string, string> = {
  shipFromId: 'Ship from address',
  name: 'Full name',
  address1: 'Address line 1',
  city: 'City',
  postalCode: 'Postal code',
  country: 'Country',
  province: 'Province / state',
  phone: 'Phone',
  email: 'Email',
  products: 'Products',
  quantity: 'Quantity',
  description: 'Description',
  unitValue: 'Unit value',
  hsCode: 'HS code',
  originCountry: 'Country of origin',
  length: 'Length',
  width: 'Width',
  height: 'Height',
  weight: 'Weight',
  pickupDate: 'Pickup date',
  insurance: 'Insurance',
  reference: 'Reference',
}

/** The names of the fields with an error, once each, in form order ("Full name", "Phone"): what a toast lists. */
export function errorLabels(errors: FieldErrors | undefined, key = ''): string[] {
  if (!errors) return []
  const labels = Object.entries(errors).flatMap(([name, node]) => {
    if (!node || typeof node !== 'object') return []
    if ('message' in node && typeof node.message === 'string') return [FIELD_LABEL[name] ?? FIELD_LABEL[key] ?? name]
    return errorLabels(node as FieldErrors, name)
  })
  return [...new Set(labels)]
}

/** The form as the rate request. Call once it is valid. */
export function toShipmentRequest(values: ShipmentFormValues): ShipmentRequest {
  const { shipTo } = values
  const units = UNITS[values.units]
  const blank = (value: string) => value.trim() || null
  const items: CustomsLine[] = values.products.map(({ product, quantity, customs }) => ({
    productId: product.id,
    sku: product.sku,
    description: customs.description.trim(),
    quantity: numberOf(quantity) ?? 1,
    unitValue: numberOf(customs.unitValue) ?? 0,
    currency: customs.currency,
    hsCode: customs.hsCode.trim() || null,
    originCountry: customs.originCountry || null,
    unitWeight: product.weight === null ? null : kgTo(product.weight, units.weight),
  }))
  return {
    shipFrom: values.shipFromId,
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
        length: numberOf(values.pkg.length) ?? 0,
        width: numberOf(values.pkg.width) ?? 0,
        height: numberOf(values.pkg.height) ?? 0,
        dimensionUnit: units.length,
        weight: numberOf(values.pkg.weight) ?? 0,
        weightUnit: units.weight,
      },
    ],
    // Always sent: providers rate from the contents even domestically (HS code and origin may be empty then)
    items,
    incoterm: values.incoterm,
    // Carriers collect: there is no drop-off
    handover: 'PICKUP',
    pickupDate: values.pickupDate,
    signature: values.signature,
    insuranceAmount: numberOf(values.insurance),
    reference: blank(values.reference),
  }
}
