import { isCrossBorder, toShipmentRequest } from '../../create/shipmentRequest'
import { packageText } from '../../create/shipmentForm'
import { shipmentSchema, type ShipmentFormValues } from '../../create/shipmentSchema'
import type { ChannelOrderDetail, Incoterm, ShipFromOption, ShipmentRequest } from '../../types'
import { unmappedLines, valuesFromOrder } from '../orderDraft'

export interface ShipmentDefaults {
  incoterm: Incoterm
  signature: boolean
}

/** What the Review step ticks off for an order. */
export interface OrderChecks {
  shipTo: boolean
  mapped: boolean
  pkg: boolean
  customs: boolean
}

export interface PreparedOrder {
  checks: OrderChecks
  /** Why it can't be quoted, one line; empty when ready. */
  problem: string
  /** Null until the order is ready. */
  request: ShipmentRequest | null
  values: ShipmentFormValues
}

/**
 * One order as the single-order flow would fill it (its ship-to, mapped products, package and customs), checked
 * with the same schema. An order that fails any check is not quoted: it is listed with the reason instead.
 * The province check is left to the server (it needs the country's list).
 */
export function prepareOrder(detail: ChannelOrderDetail, shipFrom: ShipFromOption | undefined, defaults: ShipmentDefaults): PreparedOrder {
  const base = valuesFromOrder(detail, shipFrom?.id ?? '')
  const values: ShipmentFormValues = { ...base, ...defaults, pkg: packageText(base.products, base.units) }
  const unmapped = unmappedLines(detail)
  const parsed = shipmentSchema({ crossBorder: isCrossBorder(values, shipFrom), toUs: values.shipTo.address.country === 'US', needsProvince: false }).safeParse(values)
  const issues = parsed.success ? [] : parsed.error.issues
  const has = (test: (path: PropertyKey[]) => boolean) => issues.some((issue) => test(issue.path))
  const checks: OrderChecks = {
    shipTo: !detail.shipToError && !has((path) => path[0] === 'shipTo'),
    mapped: unmapped.length === 0 && values.products.length > 0,
    pkg: !has((path) => path[0] === 'pkg'),
    customs: !has((path) => path[0] === 'products' && path[2] === 'customs'),
  }
  const problem = !shipFrom
    ? 'Pick a ship-from'
    : shipFrom.missing.length
      ? `Ship-from lacks ${shipFrom.missing.join(', ')}`
      : detail.order.fulfillment !== 'TO_BOOK'
        ? 'No longer To Book'
        : !checks.mapped
          ? unmapped.length
            ? `SKU not mapped: ${unmapped.map((line) => line.sku).join(', ')}`
            : 'No products'
          : !checks.shipTo
            ? detail.shipToError ?? 'Ship-to address incomplete'
            : !checks.customs
              ? 'Customs incomplete (HS code or origin)'
              : !checks.pkg
                ? 'Package size or weight missing'
                : !parsed.success
                  ? 'Details incomplete'
                  : ''
  return { checks, problem, request: problem ? null : toShipmentRequest(values), values }
}
