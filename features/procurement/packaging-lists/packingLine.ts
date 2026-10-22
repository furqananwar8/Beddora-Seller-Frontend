import type { PackablePoLines, PackagingLineBody, PackagingLineDetail, PoProduct } from '@/services/api/procurement.api'
import { cbmOf } from '../shared/units'

/** What the user typed for one SKU of one PO. Carton dimensions are in cm; empty net weight follows the product. */
export interface LineValue {
  units: string
  cartons: string
  cartonL: string
  cartonW: string
  cartonH: string
  net: string
  gross: string
}

export type PackableLine = PackablePoLines['lines'][number]

export const lineKey = (purchaseOrderId: number, productId: number) => `${purchaseOrderId}:${productId}`

export const EMPTY_LINE: LineValue = { units: '', cartons: '', cartonL: '', cartonW: '', cartonH: '', net: '', gross: '' }

const round = (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places
const wholeNumber = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value) : NaN)
const positive = (value: string) => (value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : NaN)
const shown = (value: number | null) => (value === null ? '' : String(round(value, 2)))
const numberOrNull = (value: number) => (Number.isFinite(value) ? value : null)

/** Net weight the product's own weight gives for these units (0 when the product has no weight yet). */
export const productNetKg = (product: Pick<PoProduct, 'weightKg'>, units: number) => round((product.weightKg ?? 0) * units, 3)

/** The product's own dimensions as the starting carton size; the user can overwrite them per line. */
export const defaultCarton = (product: Pick<PoProduct, 'lengthCm' | 'widthCm' | 'heightCm'>): Pick<LineValue, 'cartonL' | 'cartonW' | 'cartonH'> => ({
  cartonL: shown(product.lengthCm),
  cartonW: shown(product.widthCm),
  cartonH: shown(product.heightCm),
})

/** A line not typed on yet: everything still available, in cartons the size of the product. */
export const newLine = (line: PackableLine): LineValue => ({ ...EMPTY_LINE, units: String(line.available), ...defaultCarton(line.product) })

/**
 * A saved line back as typed values: the carton size saved on the list, never re-read from the product. A net weight
 * equal to the product's was never typed, so it is left empty to keep following the product; likewise a gross weight
 * equal to the net. A line saved before cartons were recorded keeps an empty carton, so its CBM stays the saved one.
 */
export function savedLine(line: PackagingLineDetail): LineValue {
  const { lengthCm, widthCm, heightCm } = line.carton
  return {
    units: String(line.units),
    cartons: String(line.cartons),
    cartonL: shown(lengthCm),
    cartonW: shown(widthCm),
    cartonH: shown(heightCm),
    net: line.netWeightKg === productNetKg(line.product, line.units) ? '' : String(line.netWeightKg),
    gross: line.grossWeightKg === line.netWeightKg ? '' : String(line.grossWeightKg),
  }
}

/** Live figures for one line: remaining after this list, CBM from the carton size, net weight (typed, else from the product), and what is wrong. */
export function computeLine(line: PackableLine, value: LineValue | undefined) {
  const units = value ? wholeNumber(value.units || '0') : 0
  const cartons = value ? wholeNumber(value.cartons || '0') : 0
  const typedNet = value?.net.trim() ? Number(value.net) : NaN
  const gross = value?.gross.trim() ? Number(value.gross) : NaN
  const [l, w, h] = value ? [positive(value.cartonL), positive(value.cartonW), positive(value.cartonH)] : [NaN, NaN, NaN]
  const hasCarton = [l, w, h].every(Number.isFinite)
  const safeUnits = Number.isFinite(units) ? units : 0
  const safeCartons = Number.isFinite(cartons) ? cartons : 0
  const productNet = productNetKg(line.product, safeUnits)
  const net = Number.isFinite(typedNet) && typedNet >= 0 ? typedNet : productNet
  const errors: { units?: string; cartons?: string; carton?: string; net?: string; gross?: string } = {}
  if (!Number.isFinite(units)) errors.units = 'Whole units only'
  else if (units > line.available) errors.units = `Only ${line.available.toLocaleString('en-CA')} available`
  if (safeUnits > 0 && !(cartons >= 1)) errors.cartons = 'Required'
  if (safeUnits > 0 && !hasCarton) errors.carton = 'Enter L, W and H'
  if (value?.net.trim() && (!Number.isFinite(typedNet) || typedNet < 0)) errors.net = 'Not a weight'
  if (value?.gross.trim() && (!Number.isFinite(gross) || gross < 0)) errors.gross = 'Not a weight'
  else if (Number.isFinite(gross) && gross < net) errors.gross = `Below net ${net} kg`
  return {
    units: safeUnits,
    cartons: safeCartons,
    carton: { length: numberOrNull(l), width: numberOrNull(w), height: numberOrNull(h) },
    remaining: line.available - safeUnits,
    // Cartons x the carton's volume; without a carton size it falls back to the product's CBM per unit (as the server does)
    cbm: hasCarton ? round(cbmOf(l, w, h, 'CM') * safeCartons, 4) : round((line.product.cbm ?? 0) * safeUnits, 4),
    net,
    productNet,
    // Left empty, gross is taken as net (the server does the same)
    gross: Number.isFinite(gross) && gross > 0 ? gross : net,
    errors,
  }
}

export type LineFigures = ReturnType<typeof computeLine>

/** One line as the API takes it. */
export const toLineBody = (purchaseOrderId: number, productId: number, figures: LineFigures, value: LineValue | undefined): PackagingLineBody => ({
  purchaseOrderId,
  productId,
  units: figures.units,
  cartons: figures.cartons,
  cartonLength: figures.carton.length,
  cartonWidth: figures.carton.width,
  cartonHeight: figures.carton.height,
  cartonUnit: 'CM',
  // Left empty, the server takes the product's weight x units
  netWeightKg: value?.net.trim() ? Number(value.net) : null,
  grossWeightKg: value?.gross.trim() ? Number(value.gross) : 0,
})
