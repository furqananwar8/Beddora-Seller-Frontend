import type { InboundShipment, PoolMapping } from './types'

/**
 * Several channel SKUs are bound to the same internal SKU, so they draw on one allocation: booking 10 of a 5-per-unit
 * channel SKU uses 50 internal units that every other channel SKU on it can no longer have. These helpers keep the
 * booking table honest about that; the figures are in internal units, keyed by internal SKU.
 */

/** Internal units each internal SKU still has free: what the channel allocated, less what open shipments already hold. */
export function internalRemaining(mappings: PoolMapping[], openShipments: InboundShipment[]): Map<string, number> {
  const left = new Map<string, number>()
  for (const m of mappings) left.set(m.sku, m.allocated)
  for (const shipment of openShipments) {
    for (const item of shipment.items) {
      for (const m of item.mapping ?? []) {
        if (left.has(m.sku)) left.set(m.sku, Math.max(0, (left.get(m.sku) ?? 0) - m.quantity))
      }
    }
  }
  return left
}

export interface Holder {
  /** The shipment's reference, e.g. "SHP-0016". */
  reference: string
  /** Internal units it holds of the SKU. */
  units: number
}

/** The open shipments holding each internal SKU, and how many internal units each one holds. */
export function internalHolders(openShipments: InboundShipment[]): Map<string, Holder[]> {
  const holders = new Map<string, Holder[]>()
  for (const shipment of openShipments) {
    const held = new Map<string, number>()
    for (const item of shipment.items) for (const m of item.mapping ?? []) held.set(m.sku, (held.get(m.sku) ?? 0) + m.quantity)
    for (const [sku, units] of held) if (units > 0) holders.set(sku, [...(holders.get(sku) ?? []), { reference: shipment.reference, units }])
  }
  return holders
}

export interface BookingLine {
  productId: string
  sku: string
  mapping: PoolMapping[]
  /** Channel units to book (cases already multiplied out for WFS). */
  units: number
}

/**
 * Walks the lines in table order, charging each one's internal units against what is free. A line that no longer fits
 * gets a message that lays out where the allocation went (other shipments, then the lines picked before it), in
 * internal units; the lines that came first are left alone.
 */
export function overbookings(lines: BookingLine[], remaining: Map<string, number>, holders: Map<string, Holder[]>, format: (n: number) => string): Record<string, string> {
  const used = new Map<string, { units: number; by: Array<{ sku: string; units: number; sold: number; perUnit: number }> }>()
  const problems: Record<string, string> = {}
  for (const line of lines) {
    for (const m of line.mapping) {
      const need = line.units * m.perUnit
      const taken = used.get(m.sku) ?? { units: 0, by: [] }
      const free = (remaining.get(m.sku) ?? m.allocated) - taken.units
      if (need > free && !problems[line.productId]) {
        const where = [...(holders.get(m.sku) ?? []).map((h) => `${h.reference} holds ${format(h.units)}`), ...taken.by.map((t) => `${t.sku} takes ${format(t.units)} (${format(t.sold)} × ${format(t.perUnit)})`)]
        problems[line.productId] = `${m.sku}: ${format(Math.max(0, free))} of ${format(m.allocated)} left${where.length ? ` (${where.join(', ')})` : ''}, this needs ${format(need)}`
      }
      taken.units += need
      if (need > 0) taken.by.push({ sku: line.sku, units: need, sold: line.units, perUnit: m.perUnit })
      used.set(m.sku, taken)
    }
  }
  return problems
}

/** The most units of a channel SKU the free internal allocation can still cover, after the lines already counted. */
export function fitUnits(mapping: PoolMapping[], available: number, free: Map<string, number>): number {
  return mapping.reduce((fit, m) => Math.min(fit, Math.floor((free.get(m.sku) ?? m.allocated) / m.perUnit)), available)
}

/** Takes a line's internal units out of what is free. */
export function charge(free: Map<string, number>, mapping: PoolMapping[], units: number): void {
  for (const m of mapping) free.set(m.sku, Math.max(0, (free.get(m.sku) ?? m.allocated) - units * m.perUnit))
}
