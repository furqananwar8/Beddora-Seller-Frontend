import { fromInternational } from '@/components/phone-field/PhoneField'
import { customsFromProduct, EMPTY_SHIP_TO, newDraft, type PickedProduct, type ShipmentDraft, type ShipToDraft } from '../create/shipmentDraft'
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
  hsCode: null,
  originCountry: null,
  unitValue: null,
  currency: null,
})

const shipToFrom = (address: ShipAddress | null): ShipToDraft =>
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

/** Customs from the product's last booking; without one, the value the customer paid on this order. */
function customsFromOrder(product: ShippingProduct, detail: ChannelOrderDetail) {
  const customs = customsFromProduct(product)
  const line = detail.lines.find((candidate) => (candidate.product?.id ?? null) === (product.id > 0 ? product.id : null) && candidate.unitPrice != null)
  if (customs.unitValue || !line?.unitPrice) return customs
  const currency = line.currency === 'CAD' || line.currency === 'USD' ? line.currency : customs.currency
  return { ...customs, unitValue: String(line.unitPrice), currency }
}

/**
 * A channel order as a draft on the Shipment Info step, for review before rates: its ship-to, one product per mapped product (units = quantity ×
 * units per item, summed when a bundle repeats a product) and one stand-in per unmapped SKU. The reducer's `load`
 * fills the package from them.
 */
export function draftFromOrder(detail: ChannelOrderDetail, shipFromId: string): ShipmentDraft {
  const picked = new Map<number, PickedProduct>()
  detail.lines.forEach((line, index) => {
    const product = line.product ?? unmappedProduct(line, index)
    const units = line.quantity * (line.product ? line.unitsPerItem : 1)
    const current = picked.get(product.id)
    picked.set(product.id, { product, quantity: String((current ? Number(current.quantity) : 0) + units) })
  })
  const products = [...picked.values()]
  return {
    ...newDraft(),
    step: 1,
    shipFromId,
    shipTo: shipToFrom(detail.shipTo),
    products,
    customs: Object.fromEntries(products.map(({ product }) => [product.id, customsFromOrder(product, detail)])),
    reference: (detail.order.customerOrderId ?? detail.order.orderId).slice(0, 50),
  }
}
