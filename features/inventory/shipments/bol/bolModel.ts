import type { Bol, BolLeg, BolOverrides, BolStatus, BolView, BolWeightUnit, TrailerInput } from '@/services/api/shipmentBols.api'

/**
 * A trailer row as the BOL modal edits it: numbers held as typed text, saved ones carrying their id, BOL number and
 * status. Pure helpers only (defaults, splitting, checks); the components hold the state.
 */
export interface TrailerDraft {
  /** Stable row key (the id for saved rows). */
  key: string
  id?: number
  reference?: string
  status?: BolStatus
  pallets: string
  boxes: string
  units: string
  weight: string
  weightUnit: BolWeightUnit
  pickupNo: string
  pickupTime: string
  deliveryTime: string
  proNo: string
  truckNo: string
  trailerNo: string
  sealNo: string
  contact: string
  commodity: string
  notes: string
  overrides: BolOverrides
}

export type TrailerTextField = 'pickupNo' | 'pickupTime' | 'deliveryTime' | 'proNo' | 'truckNo' | 'trailerNo' | 'sealNo' | 'contact' | 'commodity' | 'notes'
export type TrailerCountField = 'pallets' | 'boxes' | 'units' | 'weight'

let sequence = 0
const newKey = () => `new-${++sequence}`

const num = (value: string) => (value.trim() === '' ? NaN : Number(value))
const round2 = (value: number) => Math.round(value * 100) / 100

export function fromBol(bol: Bol): TrailerDraft {
  return {
    key: String(bol.id),
    id: bol.id,
    reference: bol.reference,
    status: bol.status,
    pallets: String(bol.pallets),
    boxes: String(bol.boxes),
    units: String(bol.units),
    weight: String(bol.weight),
    weightUnit: bol.weightUnit,
    pickupNo: bol.pickupNo ?? '',
    pickupTime: bol.pickupTime ?? '',
    deliveryTime: bol.deliveryTime ?? '',
    proNo: bol.proNo ?? '',
    truckNo: bol.truckNo ?? '',
    trailerNo: bol.trailerNo ?? '',
    sealNo: bol.sealNo ?? '',
    contact: bol.contact ?? '',
    commodity: bol.commodity ?? '',
    notes: bol.notes ?? '',
    overrides: bol.overrides ?? {},
  }
}

/** `total` split into `parts` whole shares, the remainder going to the first ones (10 / 3 → 4, 3, 3). */
export function splitWhole(total: number, parts: number): number[] {
  const base = Math.floor(total / parts)
  return Array.from({ length: parts }, (_, index) => base + (index < total % parts ? 1 : 0))
}

/** `total` shared in proportion to `weights`, as whole numbers that still add up to `total`. */
function proportional(total: number, weights: number[]): number[] {
  const sum = weights.reduce((s, w) => s + w, 0)
  if (sum === 0) return splitWhole(total, weights.length)
  const shares = weights.map((w) => Math.floor((total * w) / sum))
  let left = total - shares.reduce((s, v) => s + v, 0)
  for (let index = 0; left > 0; index = (index + 1) % shares.length, left--) shares[index]++
  return shares
}

function blankDraft(view: BolView, leg: BolLeg): Omit<TrailerDraft, 'pallets' | 'boxes' | 'units' | 'weight'> {
  return {
    key: newKey(),
    weightUnit: 'LB',
    pickupNo: '',
    pickupTime: view.defaults.pickupTime ?? '',
    deliveryTime: leg.deliveryTime ?? '',
    proNo: '',
    truckNo: '',
    trailerNo: '',
    sealNo: '',
    contact: view.defaults.contact ?? '',
    commodity: view.defaults.commodity,
    notes: '',
    overrides: {},
  }
}

/**
 * `count` trailers for a leg with nothing saved yet: boxes split evenly, each box's units going with it, pallets
 * and weight shared by the boxes each one carries. Only the pick-up # is left to type.
 */
export function plannedTrailers(view: BolView, leg: BolLeg, count: number): TrailerDraft[] {
  const parts = Math.max(1, Math.min(count, Math.max(1, leg.totals.boxes)))
  const boxes = splitWhole(leg.totals.boxes, parts)
  const units = proportional(leg.totals.units, boxes)
  const pallets = proportional(Math.max(parts, leg.suggested.pallets), boxes).map((p, index) => Math.max(1, Math.min(p, boxes[index] || 1)))
  return boxes.map((b, index) => ({
    ...blankDraft(view, leg),
    boxes: String(b),
    units: String(units[index]),
    pallets: String(pallets[index]),
    weight: String(round2(leg.totals.boxes ? (leg.suggested.weight * b) / leg.totals.boxes : 0)),
  }))
}

/** One more trailer, taking whatever the leg still has unassigned (0 when everything is on a trailer already). */
export function nextTrailer(view: BolView, leg: BolLeg, drafts: TrailerDraft[]): TrailerDraft {
  const used = usedOf(drafts)
  const boxes = Math.max(0, leg.totals.boxes - used.boxes)
  const units = Math.max(0, leg.totals.units - used.units)
  const share = leg.totals.boxes ? boxes / leg.totals.boxes : 0
  return {
    ...blankDraft(view, leg),
    boxes: String(boxes),
    units: String(units),
    pallets: String(boxes ? Math.max(1, Math.min(boxes, Math.round(leg.suggested.pallets * share))) : 0),
    weight: String(round2(leg.suggested.weight * share)),
  }
}

export function usedOf(drafts: TrailerDraft[]) {
  return drafts.reduce(
    (sum, d) => ({ boxes: sum.boxes + (num(d.boxes) || 0), units: sum.units + (num(d.units) || 0), pallets: sum.pallets + (num(d.pallets) || 0), weight: sum.weight + (num(d.weight) || 0) }),
    { boxes: 0, units: 0, pallets: 0, weight: 0 }
  )
}

export type RowErrors = Partial<Record<TrailerCountField | 'pickupTime' | 'deliveryTime', string>>

const TIME = /^([01]\d|2[0-3]):[0-5]\d( [A-Za-z]{2,5})?$/

export function rowErrors(d: TrailerDraft): RowErrors {
  const errors: RowErrors = {}
  const whole = (field: 'pallets' | 'boxes' | 'units', label: string) => {
    const value = num(d[field])
    if (!Number.isInteger(value) || value < 1) errors[field] = `${label}: whole number, 1 or more`
  }
  whole('pallets', 'Pallets')
  whole('boxes', 'Boxes')
  whole('units', 'Units')
  if (!errors.pallets && !errors.boxes && num(d.pallets) > num(d.boxes)) errors.pallets = "Pallets can't be more than boxes"
  if (!errors.units && !errors.boxes && num(d.units) < num(d.boxes)) errors.units = "Units can't be fewer than boxes"
  if (!(num(d.weight) > 0)) errors.weight = 'Weight must be above 0'
  if (d.pickupTime.trim() && !TIME.test(d.pickupTime.trim())) errors.pickupTime = 'HH:MM, optionally with a zone (13:00 EDT)'
  if (d.deliveryTime.trim() && !TIME.test(d.deliveryTime.trim())) errors.deliveryTime = 'HH:MM, optionally with a zone (13:00 EDT)'
  return errors
}

/** What blocks saving a leg's trailers: totals over the leg, then the first row with a problem. */
export function checkLeg(leg: BolLeg, drafts: TrailerDraft[]) {
  const used = usedOf(drafts)
  const overBoxes = Math.max(0, used.boxes - leg.totals.boxes)
  const overUnits = Math.max(0, used.units - leg.totals.units)
  const rows = drafts.map(rowErrors)
  const firstRow = rows.findIndex((errors) => Object.keys(errors).length > 0)
  const blocker =
    overBoxes > 0
      ? `${overBoxes} boxes over the shipment: ${leg.fulfillmentCenter} has ${leg.totals.boxes}`
      : overUnits > 0
      ? `${overUnits} units over the shipment: ${leg.fulfillmentCenter} has ${leg.totals.units}`
      : firstRow >= 0
      ? `Trailer ${firstRow + 1}: ${Object.values(rows[firstRow])[0]}`
      : null
  return {
    used,
    rows,
    overBoxes,
    overUnits,
    blocker,
    unassigned: { boxes: Math.max(0, leg.totals.boxes - used.boxes), units: Math.max(0, leg.totals.units - used.units) },
  }
}

const orNull = (value: string) => value.trim() || null

export function toInput(d: TrailerDraft): TrailerInput {
  return {
    ...(d.id !== undefined ? { id: d.id } : {}),
    pallets: Number(d.pallets),
    boxes: Number(d.boxes),
    units: Number(d.units),
    weight: Number(d.weight),
    weightUnit: d.weightUnit,
    pickupNo: orNull(d.pickupNo),
    pickupTime: orNull(d.pickupTime),
    deliveryTime: orNull(d.deliveryTime),
    proNo: orNull(d.proNo),
    truckNo: orNull(d.truckNo),
    trailerNo: orNull(d.trailerNo),
    sealNo: orNull(d.sealNo),
    contact: orNull(d.contact),
    commodity: orNull(d.commodity),
    notes: orNull(d.notes),
    overrides: d.overrides,
  }
}

/** True when the rows differ from what is saved (new, removed, reordered or edited rows). */
export function isDirty(leg: BolLeg, drafts: TrailerDraft[]): boolean {
  if (drafts.length !== leg.bols.length) return true
  return drafts.some((d, index) => d.id !== leg.bols[index].id || JSON.stringify(toInput(d)) !== JSON.stringify(toInput(fromBol(leg.bols[index]))))
}
