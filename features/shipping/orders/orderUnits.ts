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

/** "Unit 3", "Units 1, 2". */
export const unitsLabel = (unitNos: number[]) => (unitNos.length === 1 ? `Unit ${unitNos[0]}` : `Units ${unitNos.join(', ')}`)
