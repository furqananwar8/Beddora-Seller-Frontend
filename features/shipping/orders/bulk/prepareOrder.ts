import { isCrossBorder, toShipmentRequest } from '../../create/shipmentRequest'
import { numberOf, packageText } from '../../create/shipmentForm'
import { shipmentSchema, type ShipmentFormValues } from '../../create/shipmentSchema'
import type { ChannelOrderDetail, Incoterm, ShipFromOption, ShipmentRequest } from '../../types'
import { unmappedLines, valuesFromOrder } from '../orderDraft'
import { detailForUnits } from '../orderUnits'

/** A booking's package as typed: length, width, height, weight. */
export type PackageText = ShipmentFormValues['pkg']

/** The package one quantity works out to from its product (what each quantity's size starts from). */
export function unitPackage(detail: ChannelOrderDetail, unitNo: number): PackageText {
  const base = valuesFromOrder(detailForUnits(detail, [unitNo]), '')
  return packageText(base.products, base.units)
}

/** At most this many packages in one booking (the server's limit). */
export const MAX_PACKAGES = 10

export interface ShipmentDefaults {
  incoterm: Incoterm
  signature: boolean
  /** Protection (insurance): quoted and bought for the declared value of each booking's items. */
  protection: boolean
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
/**
 * `packages` (one per quantity) replaces the single package: the request then carries each, so rates match exactly these boxes.
 */
export function prepareOrder(detail: ChannelOrderDetail, shipFrom: ShipFromOption | undefined, defaults: ShipmentDefaults, pkg?: PackageText, packages?: PackageText[]): PreparedOrder {
  const base = valuesFromOrder(detail, shipFrom?.id ?? '')
  // shortcut: the declared value sums the customs lines as typed (CAD or USD alike); carriers other than Stallion read it as CAD, fix when mixed-currency orders matter
  const declared = base.products.reduce((sum, { quantity, customs }) => sum + (Number(customs.unitValue) || 0) * (Number(quantity) || 0), 0)
  const { protection, ...shipment } = defaults
  const values: ShipmentFormValues = { ...base, ...shipment, insurance: protection && declared > 0 ? String(Math.round(declared * 100) / 100) : '', pkg: packages?.[0] ?? pkg ?? packageText(base.products, base.units) }
  const unmapped = unmappedLines(detail)
  const parsed = shipmentSchema({ crossBorder: isCrossBorder(values, shipFrom), toUs: values.shipTo.address.country === 'US', needsProvince: false }).safeParse(values)
  const issues = parsed.success ? [] : parsed.error.issues
  const has = (test: (path: PropertyKey[]) => boolean) => issues.some((issue) => test(issue.path))
  const checks: OrderChecks = {
    shipTo: !detail.shipToError && !has((path) => path[0] === 'shipTo'),
    mapped: unmapped.length === 0 && values.products.length > 0,
    pkg: !has((path) => path[0] === 'pkg') && (packages ?? []).every((one) => [one.length, one.width, one.height, one.weight].every((value) => (numberOf(value) ?? 0) > 0)),
    customs: !has((path) => path[0] === 'products' && path[2] === 'customs'),
  }
  const problem = !shipFrom
    ? 'Pick a ship-from'
    : shipFrom.missing.length
      ? `Ship-from lacks ${shipFrom.missing.join(', ')}`
      : !(detail.order.fulfillment === 'TO_BOOK' || (detail.order.fulfillment === 'BOOKED' && detail.units.some((unit) => !unit.booking)))
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
                : packages && packages.length > MAX_PACKAGES
                  ? `At most ${MAX_PACKAGES} packages in one booking`
                  : !parsed.success
                  ? 'Details incomplete'
                  : ''
  const request = problem ? null : toShipmentRequest(values)
  if (request && packages) request.packages = packages.map((one) => toShipmentRequest({ ...values, pkg: one }).packages[0])
  return { checks, problem, request, values }
}
