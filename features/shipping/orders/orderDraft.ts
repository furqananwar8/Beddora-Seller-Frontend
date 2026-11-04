import { fromInternational } from '@/components/phone-field/PhoneField'
import { customsFromProduct, EMPTY_SHIP_TO, newShipmentValues, productLine, type ProductLine, type ShipToValues } from '../create/shipmentForm'
import type { ShipmentFormValues } from '../create/shipmentSchema'
import type { ChannelOrderDetail, ChannelOrderDetailLine, ShipAddress, ShippingProduct } from '../types'

/** The stand-in for a SKU not mapped to our products (see `isUnmapped`): nothing known but its name and SKU. */
const unmappedProduct = (line: ChannelOrderDetailLine, index: number): ShippingProduct => ({
  id: -(index + 1),
  sku: line.sku,
  name: line.productName,
  variantName: null,
  upc: null,
  hasPhoto: false,
  weight: null,
  weightUnit: 'KG',
  length: null,
  width: null,
  height: null,
  dimensionUnit: 'CM',
  description: line.productName,
  categoryName: null,
  hsCode: null,
  originCountry: null,
  unitValue: null,
  currency: null,
})

const shipToFrom = (address: ShipAddress | null): ShipToValues =>
  address
    ? {
        name: address.name,
        company: address.company ?? '',
        address1: address.address1,
        address2: address.address2 ?? '',
        email: address.email ?? '',
        address: { country: address.country, province: address.province, city: address.city, postalCode: address.postalCode },
        phone: fromInternational(address.phone, address.country),
        residential: address.residential,
      }
    : EMPTY_SHIP_TO

/** Customs from the product; without a value on record, what the customer paid for it on this order. */
function customsFromOrder(product: ShippingProduct, detail: ChannelOrderDetail): ProductLine['customs'] {
  const customs = customsFromProduct(product)
  const line = detail.lines.find((candidate) => (candidate.product?.id ?? null) === (product.id > 0 ? product.id : null) && candidate.unitPrice != null)
  if (customs.unitValue || !line?.unitPrice) return customs
  const currency = line.currency === 'CAD' || line.currency === 'USD' ? line.currency : customs.currency
  return { ...customs, unitValue: String(line.unitPrice), currency }
}

/**
 * A channel order as the form's values, for review before rates: its ship-to (editable), one product per mapped
 * product (units = quantity × units per item, summed when a bundle repeats a product) and one stand-in per
 * unmapped SKU, which blocks booking until it is mapped. The package fills itself from the products.
 */
export function valuesFromOrder(detail: ChannelOrderDetail, shipFromId: string): ShipmentFormValues {
  const picked = new Map<number, ProductLine>()
  detail.lines.forEach((line, index) => {
    const product = line.product ?? unmappedProduct(line, index)
    const units = line.quantity * (line.product ? line.unitsPerItem : 1)
    const current = picked.get(product.id)
    const base = current ?? { ...productLine(product), customs: customsFromOrder(product, detail) }
    picked.set(product.id, { ...base, quantity: String((current ? Number(current.quantity) : 0) + units) })
  })
  return {
    ...newShipmentValues(),
    shipFromId,
    shipTo: shipToFrom(detail.shipTo),
    products: [...picked.values()],
    reference: (detail.order.customerOrderId ?? detail.order.orderId).slice(0, 50),
  }
}
