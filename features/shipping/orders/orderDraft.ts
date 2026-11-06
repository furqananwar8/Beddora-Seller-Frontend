import { fromInternational } from '@/components/phone-field/PhoneField'
import { CUSTOMS_DESCRIPTION_MAX, customsFromProduct, EMPTY_SHIP_TO, isOrigin, newShipmentValues, type ProductLine, type ShipToValues } from '../create/shipmentForm'
import type { OrderLineSource, ShipmentFormValues } from '../create/shipmentSchema'
import type { ChannelOrderDetail, ChannelOrderDetailLine, CustomsCurrency, ShipAddress } from '../types'

/** Ship-to addresses are always residential: marketplace parcels go to the buyer's door. */
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
        residential: true,
      }
    : EMPTY_SHIP_TO

const currencyOf = (line: ChannelOrderDetailLine): CustomsCurrency | null => (line.currency === 'CAD' || line.currency === 'USD' ? line.currency : null)

/** The order's lines that aren't mapped to one of our products: they must be mapped in the SKU Mapper before booking. */
export const unmappedLines = (detail: ChannelOrderDetail): ChannelOrderDetailLine[] => {
  const seen = new Set<string>()
  return detail.lines.filter((line) => !line.product && !seen.has(line.sku) && seen.add(line.sku))
}

/**
 * A mapped order line's customs: what the order says (its title, the price paid per unit and currency), the
 * product's HS code and origin when it has them (else left empty to be picked: no guessing the country).
 */
function customsFromOrder(line: ChannelOrderDetailLine): ProductLine['customs'] {
  const product = line.product!
  const fromProduct = customsFromProduct(product)
  return {
    description: (line.productName || fromProduct.description).slice(0, CUSTOMS_DESCRIPTION_MAX).trimEnd(),
    unitValue: line.unitPrice != null ? String(line.unitPrice) : fromProduct.unitValue,
    currency: currencyOf(line) ?? fromProduct.currency,
    hsCode: product.hsCode ?? '',
    originCountry: isOrigin(product.originCountry) ? product.originCountry : '',
  }
}

/**
 * A channel order as the form's values, for review before rates: its ship-to (editable) and one row per product
 * the order's SKUs map to (units = ordered items × our units per item, summed when several lines map to the same
 * product). SKUs with no mapping aren't rows; see `unmappedLines`. The package fills itself from the products.
 */
export function valuesFromOrder(detail: ChannelOrderDetail, shipFromId: string): ShipmentFormValues {
  const rows = new Map<number, ProductLine>()
  for (const line of detail.lines) {
    if (!line.product) continue
    const source: OrderLineSource = { sku: line.sku, name: line.productName, items: line.quantity, unitsPerItem: line.unitsPerItem, currency: currencyOf(line) }
    const units = line.quantity * line.unitsPerItem
    const row = rows.get(line.product.id)
    if (row) rows.set(line.product.id, { ...row, quantity: String(Number(row.quantity) + units), sources: [...(row.sources ?? []), source] })
    else rows.set(line.product.id, { product: line.product, quantity: String(units), customs: customsFromOrder(line), sources: [source] })
  }
  return {
    ...newShipmentValues(),
    shipFromId,
    shipTo: shipToFrom(detail.shipTo),
    products: [...rows.values()],
    reference: (detail.order.customerOrderId ?? detail.order.orderId).slice(0, 50),
  }
}
