/**
 * Per-piece volume of a packed SKU (the server works it out the same way for saved lines):
 * CBM per carton = L x W x H (cm) / 1,000,000; units per carton = units / cartons; CBM per piece = the two divided.
 * Each is null while what it needs is missing.
 */

export interface CartonMetrics {
  cbmPerCarton: number | null
  unitsPerCarton: number | null
  cbmPerPiece: number | null
}

const CM3_PER_M3 = 1_000_000
const positive = (value: number | null) => (value !== null && Number.isFinite(value) && value > 0 ? value : null)

export function cartonMetrics(units: number, cartons: number, lengthCm: number | null, widthCm: number | null, heightCm: number | null): CartonMetrics {
  const [length, width, height] = [positive(lengthCm), positive(widthCm), positive(heightCm)]
  const cbmPerCarton = length && width && height ? (length * width * height) / CM3_PER_M3 : null
  const unitsPerCarton = cartons > 0 && units > 0 ? units / cartons : null
  return { cbmPerCarton, unitsPerCarton, cbmPerPiece: cbmPerCarton !== null && unitsPerCarton ? cbmPerCarton / unitsPerCarton : null }
}

export const formatUnitsPerCarton = (value: number | null): string => (value === null ? '—' : value.toLocaleString('en-CA', { maximumFractionDigits: 2 }))
export const formatCbmPerPiece = (value: number | null): string => (value === null ? '—' : value.toFixed(6))
