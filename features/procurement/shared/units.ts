import type { LengthUnit, WeightUnit } from '@/services/api/procurement.api'

const KG_PER_LB = 0.45359237
const CM_PER_IN = 2.54
const CBM_PER_CUBIC_INCH = 0.0000163871

const round = (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places

/** kg → the unit the user picked (2 decimals). Mirrors the backend's canonical storage. */
export const kgTo = (kg: number, unit: WeightUnit): number => round(unit === 'LB' ? kg / KG_PER_LB : kg, 2)
export const cmTo = (cm: number, unit: LengthUnit): number => round(unit === 'IN' ? cm / CM_PER_IN : cm, 2)

/** Re-expresses a typed value when its toggle flips, so 6.4 kg becomes 14.11 lb rather than 6.4 lb. */
export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value
  return round(to === 'LB' ? value / KG_PER_LB : value * KG_PER_LB, 2)
}

export function convertLength(value: number, from: LengthUnit, to: LengthUnit): number {
  if (from === to) return value
  return round(to === 'IN' ? value / CM_PER_IN : value * CM_PER_IN, 2)
}

/** CM: L×W×H ÷ 1,000,000 · IN: L×W×H × 0.0000163871. Always m³. */
export function cbmOf(length: number, width: number, height: number, unit: LengthUnit): number {
  const cubic = length * width * height
  return round(unit === 'IN' ? cubic * CBM_PER_CUBIC_INCH : cubic / 1_000_000, 6)
}

const trim = (value: number, places = 2) => Number(value.toFixed(places)).toLocaleString('en-CA', { maximumFractionDigits: places })

export const formatWeight = (kg: number | null, unit: WeightUnit): string => (kg === null ? '—' : `${trim(kgTo(kg, unit))} ${unit.toLowerCase()}`)

export function formatDimensions(l: number | null, w: number | null, h: number | null, unit: LengthUnit): string {
  if (l === null || w === null || h === null) return '—'
  return `${[l, w, h].map((part) => trim(cmTo(part, unit))).join(' × ')} ${unit.toLowerCase()}`
}

export const formatCbm = (cbm: number | null): string => (cbm === null ? '—' : cbm.toFixed(4))

export const formatSize = (value: number | null, unit: LengthUnit | null): string => (value === null ? '—' : `${trim(value)} ${(unit ?? 'IN').toLowerCase()}`)
