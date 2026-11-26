import type { ChannelOrderDetail } from '../types'

/** The unit numbers no booking covers yet. */
export const freeUnitNos = (detail: ChannelOrderDetail): number[] => detail.units.filter((unit) => !unit.booking).map((unit) => unit.unitNo)

/**
 * The order as if it held only these units: each line keeps just the quantity those units make up and lines left with
 * none drop out. Package, customs and rates for a booking are built from this, so a booking of some units prices and
 * ships only those units. All units given = the order unchanged.
 */
export function detailForUnits(detail: ChannelOrderDetail, unitNos: number[]): ChannelOrderDetail {
  if (unitNos.length === detail.units.length) return detail
  const wanted = new Set(unitNos)
  const perLine = new Map<string, number>()
  for (const unit of detail.units) if (wanted.has(unit.unitNo)) perLine.set(unit.lineNumber, (perLine.get(unit.lineNumber) ?? 0) + 1)
  return { ...detail, lines: detail.lines.filter((line) => perLine.has(line.lineNumber)).map((line) => ({ ...line, quantity: perLine.get(line.lineNumber)! })) }
}

/** Unit numbers cut into bookings of `size` units (the last takes the rest); a size of 0 or more than there are = one booking. */
export function chunkUnits(unitNos: number[], size: number): number[][] {
  const per = size > 0 && size < unitNos.length ? size : unitNos.length
  const groups: number[][] = []
  for (let start = 0; start < unitNos.length; start += per || 1) groups.push(unitNos.slice(start, start + per))
  return groups
}

/** "Qty 3", "Qty 1, 2": which of the order's items a booking covers. */
export const unitsLabel = (unitNos: number[]) => `Qty ${unitNos.join(', ')}`

/** What the user chose for an order: its SKUs combined or separate, how many of each SKU to book now, and whether a SKU's quantities ship together or one booking each. */
export interface BookingPlan {
  /** One booking with every SKU in it (false: a separate booking for each SKU). */
  combine: boolean
  /** Per SKU: how many of its free quantities to book now (default all), and, when booked separately, one booking per quantity. */
  skus: Record<string, { take?: number; each?: boolean }>
}

/** Everything in one booking: what an order is booked as until the user chooses otherwise. */
export const defaultPlan = (): BookingPlan => ({ combine: true, skus: {} })

/** The bookings (unit numbers in each) a plan makes of the free quantities; quantities not taken stay free for later. */
export function planGroups(plan: BookingPlan, units: { unitNo: number; sku: string }[], free: number[]): number[][] {
  const bySku = new Map<string, number[]>()
  for (const unitNo of free) {
    const sku = units.find((unit) => unit.unitNo === unitNo)?.sku ?? ''
    bySku.set(sku, [...(bySku.get(sku) ?? []), unitNo])
  }
  const taken = [...bySku].map(([sku, list]) => ({ sku, list: list.slice(0, Math.max(0, plan.skus[sku]?.take ?? list.length)) }))
  if (plan.combine) {
    const all = taken.flatMap(({ list }) => list).sort((a, b) => a - b)
    return all.length ? [all] : []
  }
  return taken.flatMap(({ sku, list }) => (plan.skus[sku]?.each ? list.map((unitNo) => [unitNo]) : list.length ? [list] : []))
}

/** "2 × HANGER-PACK50, 1 × HANGER-PACK200": what a set of quantities is, by SKU. */
export function unitsSummary(units: { unitNo: number; sku: string }[], unitNos: number[]): string {
  const counts = new Map<string, number>()
  for (const unitNo of unitNos) {
    const sku = units.find((unit) => unit.unitNo === unitNo)?.sku ?? '?'
    counts.set(sku, (counts.get(sku) ?? 0) + 1)
  }
  return [...counts].map(([sku, count]) => `${count} × ${sku}`).join(', ')
}

/** A quantity can be booked once its SKU is mapped to one of our products (every product line of its channel line has one). */
export function unitIsMapped(detail: ChannelOrderDetail, unitNo: number): boolean {
  const lineNumber = detail.units.find((unit) => unit.unitNo === unitNo)?.lineNumber
  const lines = detail.lines.filter((line) => line.lineNumber === lineNumber)
  return lines.length > 0 && lines.every((line) => line.product !== null)
}
