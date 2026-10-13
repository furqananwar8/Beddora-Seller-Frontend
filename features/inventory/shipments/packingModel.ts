import { BoxSpec, DimensionUnit, PackingGroup, PackingGroupItem, PackingOption, PackingSubmission, WeightUnit } from './types'

// ============================================
// Model: carton types per packing group. A carton type is `count` identical boxes;
// each box holds one or more SKU lines. "Mixed" is derived from the lines, never stored.
// Strings keep the inputs editable.
// ============================================

export interface CartonLine {
  sku: string
  unitsPerBox: string
}

export interface Carton {
  id: string
  count: string
  length: string
  width: string
  height: string
  weight: string
  lines: CartonLine[]
}

/** groupId -> carton types */
export type CartonsByGroup = Record<string, Carton[]>

export interface PackingUnits {
  dimensionUnit: DimensionUnit
  weightUnit: WeightUnit
}

export interface SkuProgress {
  item: PackingGroupItem
  packed: number
}

/** Amazon caps `quantity` (identical boxes) per carton type at 10,000. */
export const MAX_BOXES_PER_CARTON_TYPE = 10_000

const str = (n?: number) => (n === undefined ? '' : String(n))
const num = (s: string) => Number(s)
const isPositive = (s: string) => s.trim() !== '' && Number(s) > 0
const isPositiveInt = (s: string) => isPositive(s) && Number.isInteger(num(s))

let cartonSeq = 0
export const newCartonId = () => `carton-${++cartonSeq}`

export const EMPTY_DIMENSIONS = { length: '', width: '', height: '', weight: '' }

export function newCarton(init: Partial<Omit<Carton, 'id'>> & Pick<Carton, 'lines'>): Carton {
  return { id: newCartonId(), count: '1', ...EMPTY_DIMENSIONS, ...init }
}

export const isMixed = (carton: Carton) => carton.lines.length > 1

// ── Defaults

/** Full case-pack boxes plus one partial box for the remainder; one open carton when there is no case pack. */
function defaultCartonsFor(item: PackingGroupItem): Carton[] {
  const cp = item.casePack
  if (!cp || cp.unitsPerBox <= 0) {
    return [newCarton({ lines: [{ sku: item.sku, unitsPerBox: str(item.quantity) }] })]
  }
  const dims = { length: str(cp.length), width: str(cp.width), height: str(cp.height), weight: str(cp.weight) }
  const full = Math.floor(item.quantity / cp.unitsPerBox)
  const rest = item.quantity % cp.unitsPerBox
  const cartons: Carton[] = []
  if (full > 0) cartons.push(newCarton({ count: str(full), ...dims, lines: [{ sku: item.sku, unitsPerBox: str(cp.unitsPerBox) }] }))
  if (rest > 0) cartons.push(newCarton({ count: '1', ...dims, lines: [{ sku: item.sku, unitsPerBox: str(rest) }] }))
  return cartons
}

export const defaultCartons = (group: PackingGroup): Carton[] => group.items.flatMap(defaultCartonsFor)

export const cartonsFor = (option: PackingOption): CartonsByGroup =>
  Object.fromEntries(option.groups.map((g) => [g.packingGroupId, defaultCartons(g)]))

/** Units of case packs decide the modal's units; mixed units fall back to IN / LB. */
export function unitsFor(option: PackingOption): PackingUnits {
  const packs = option.groups.flatMap((g) => g.items.map((i) => i.casePack)).filter(Boolean)
  const first = packs[0]
  const same = first && packs.every((p) => p!.dimensionUnit === first.dimensionUnit && p!.weightUnit === first.weightUnit)
  return same ? { dimensionUnit: first.dimensionUnit, weightUnit: first.weightUnit } : { dimensionUnit: 'IN', weightUnit: 'LB' }
}

// ── Derived numbers

export const unitsPerCarton = (carton: Carton) => carton.lines.reduce((sum, l) => sum + (num(l.unitsPerBox) || 0), 0)

/** Units of one SKU across every carton type: boxes × units per box. */
export const packedUnitsOf = (cartons: Carton[], sku: string) =>
  cartons.reduce(
    (sum, c) => sum + (num(c.count) || 0) * c.lines.filter((l) => l.sku === sku).reduce((n, l) => n + (num(l.unitsPerBox) || 0), 0),
    0
  )

export const groupProgress = (group: PackingGroup, cartons: Carton[]): SkuProgress[] =>
  group.items.map((item) => ({ item, packed: packedUnitsOf(cartons, item.sku) }))

export const totalBoxes = (cartons: Carton[]) => cartons.reduce((sum, c) => sum + (num(c.count) || 0), 0)

export const skusInCarton = (carton: Carton) => new Set(carton.lines.map((l) => l.sku))

/** SKUs of the group that this carton could still take (a SKU appears once per box). */
export const addableItems = (group: PackingGroup, carton: Carton) =>
  group.items.filter((item) => !skusInCarton(carton).has(item.sku))

/** A new carton type for the first SKU that still has units to place, prefilled with the remainder and the last carton's size. */
export function suggestCarton(group: PackingGroup, cartons: Carton[]): Carton {
  const open = groupProgress(group, cartons).find(({ item, packed }) => packed < item.quantity)
  const item = open?.item ?? group.items[0]
  const remaining = open ? open.item.quantity - open.packed : 0
  const last = cartons[cartons.length - 1]
  const size = last ? { length: last.length, width: last.width, height: last.height, weight: last.weight } : EMPTY_DIMENSIONS
  return newCarton({ ...size, lines: [{ sku: item.sku, unitsPerBox: remaining > 0 ? str(remaining) : '' }] })
}

// ── Validation

export const cartonIsComplete = (c: Carton) =>
  isPositiveInt(c.count) &&
  num(c.count) <= MAX_BOXES_PER_CARTON_TYPE &&
  [c.length, c.width, c.height, c.weight].every(isPositive) &&
  c.lines.length > 0 &&
  skusInCarton(c).size === c.lines.length &&
  c.lines.every((l) => isPositiveInt(l.unitsPerBox))

export const groupIsValid = (group: PackingGroup, cartons: Carton[]) =>
  group.items.length > 0 &&
  cartons.length > 0 &&
  cartons.every(cartonIsComplete) &&
  groupProgress(group, cartons).every(({ item, packed }) => packed === item.quantity)

export const isPackingValid = (option: PackingOption, cartons: CartonsByGroup) =>
  option.groups.length > 0 && option.groups.every((g) => groupIsValid(g, cartons[g.packingGroupId] ?? []))

// ── Submission

export function toSubmission(option: PackingOption, cartons: CartonsByGroup, units: PackingUnits, saveCasePacks: boolean): PackingSubmission {
  return {
    packingOptionId: option.packingOptionId,
    saveCasePacks,
    groups: option.groups.map((g) => ({
      packingGroupId: g.packingGroupId,
      boxes: (cartons[g.packingGroupId] ?? []).map<BoxSpec>((c) => ({
        count: num(c.count),
        length: num(c.length),
        width: num(c.width),
        height: num(c.height),
        dimensionUnit: units.dimensionUnit,
        weight: num(c.weight),
        weightUnit: units.weightUnit,
        items: c.lines.map((l) => ({ sku: l.sku, quantity: num(l.unitsPerBox) })),
      })),
    })),
  }
}
