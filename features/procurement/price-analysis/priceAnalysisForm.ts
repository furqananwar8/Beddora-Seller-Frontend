import type { PoCurrency, PriceAnalysisBody, PriceAnalysisView, PriceFamilySettings, QuoteSample, SupplierRef } from '@/services/api/procurement.api'

/** Sample options in the order they are offered; one source for the select and the timeline labels. */
export const SAMPLE_OPTIONS: ReadonlyArray<{ value: QuoteSample; label: string }> = [
  { value: 'FREE_OF_COST', label: 'Free Of Cost' },
  { value: 'BY_CHARGE', label: 'By Charge' },
  { value: 'NOT_PROVIDED', label: 'Not Provided' },
]

export const sampleLabel = (value: QuoteSample | undefined): string => SAMPLE_OPTIONS.find((option) => option.value === value)?.label ?? 'Not Provided'

/** Cards on the screen: the cheapest five. Rows after that are kept but get no card. */
export const TOP_RANKS = 5

/** Packaging a supplier can be asked to quote; free text is accepted too. */
export const PACKAGING_SUGGESTIONS = ['Polybag', 'Color Box', 'Master Carton', 'Blister Pack', 'Shrink Wrap']

export interface QuoteRow {
  /** Stable while editing (the packaging text, which identifies the quote, changes as it is typed). */
  uid: string
  supplier: Pick<SupplierRef, 'id' | 'name' | 'contactName'>
  /** Point of contact for this quote; starts as the supplier's own contact. */
  contactName: string
  remarks: string
  sample: QuoteSample
  /** As typed: the FOB price per unit. */
  unitPrice: string
  /** How the unit is packed for this quote; empty when the supplier gave one price. */
  packagingOption: string
  /** As typed. */
  moq: string
  leadTimeDays: string
  unitCbm: string
  dutyPercent: string
}

export interface PriceAnalysisForm {
  material: string
  currency: PoCurrency
  rows: QuoteRow[]
}

export type RowErrors = Partial<Record<'contactName' | 'remarks' | 'unitPrice' | 'supplierId' | 'packagingOption' | 'moq' | 'leadTimeDays' | 'unitCbm' | 'dutyPercent', string>>

let counter = 0
export const newUid = (): string => `q${++counter}`

/** What identifies a quote on the server: the supplier, and the packaging when it quoted several. */
export const quoteKey = (supplierId: number, packagingOption: string): string => `${supplierId}|${packagingOption.trim().toLowerCase()}`
export const rowKey = (row: Pick<QuoteRow, 'supplier' | 'packagingOption'>): string => quoteKey(row.supplier.id, row.packagingOption)

/** How a quote reads in messages: the supplier, and its packaging when it has one. */
export const quoteName = (supplierName: string, packagingOption: string): string => (packagingOption.trim() ? `${supplierName} (${packagingOption.trim()})` : supplierName)

export const blankRow = (supplier: QuoteRow['supplier'], packagingOption = ''): QuoteRow => ({
  uid: newUid(),
  supplier: { id: supplier.id, name: supplier.name, contactName: supplier.contactName },
  contactName: supplier.contactName ?? '',
  remarks: '',
  sample: 'NOT_PROVIDED',
  unitPrice: '',
  packagingOption,
  moq: '',
  leadTimeDays: '',
  unitCbm: '',
  dutyPercent: '',
})

/** The saved analysis as form values; a product without one starts from its own material. */
export function formFrom(view: PriceAnalysisView): PriceAnalysisForm {
  const analysis = view.analysis
  if (!analysis) return { material: view.product.material ?? '', currency: 'USD', rows: [] }
  return {
    material: analysis.material ?? '',
    currency: analysis.currency,
    rows: analysis.quotes.map((quote) => ({
      uid: newUid(),
      supplier: { id: quote.supplier.id, name: quote.supplier.name, contactName: quote.supplier.contactName },
      contactName: quote.contactName ?? '',
      remarks: quote.remarks ?? '',
      sample: quote.sample,
      unitPrice: quote.unitPrice.toFixed(2),
      packagingOption: quote.packagingOption,
      moq: quote.moq === null ? '' : String(quote.moq),
      leadTimeDays: quote.leadTimeDays === null ? '' : String(quote.leadTimeDays),
      unitCbm: quote.unitCbm === null ? '' : String(quote.unitCbm),
      dutyPercent: quote.dutyPercent === null ? '' : String(quote.dutyPercent),
    })),
  }
}

/** Forms are the same when every typed value is: the row ids are only for React. */
const plain = (form: PriceAnalysisForm) => JSON.stringify({ ...form, rows: form.rows.map(({ uid: _uid, ...row }) => row) })
export const sameForm = (a: PriceAnalysisForm, b: PriceAnalysisForm): boolean => plain(a) === plain(b)

/** A price as typed, or null while it is not a usable amount yet. */
export function parsePrice(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  const price = Number(trimmed)
  return price > 0 && price <= 999_999_999 ? price : null
}

const parseWhole = (value: string, min: number): number | null => (/^\d+$/.test(value.trim()) && Number(value) >= min ? Number(value) : null)
const parseDecimal = (value: string, decimals: number): number | null => (new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`).test(value.trim()) ? Number(value) : null)

export function rowError(row: QuoteRow): RowErrors {
  const errors: RowErrors = {}
  if (row.unitPrice.trim() === '') errors.unitPrice = 'Enter a price'
  else if (parsePrice(row.unitPrice) === null) errors.unitPrice = 'Enter an amount above 0 with at most 2 decimals'
  if (row.contactName.length > 120) errors.contactName = 'Contact name is too long'
  if (row.remarks.length > 500) errors.remarks = 'Remarks are too long'
  if (row.packagingOption.length > 60) errors.packagingOption = 'Packaging is too long'
  if (row.moq.trim() && parseWhole(row.moq, 1) === null) errors.moq = 'Whole number, at least 1'
  if (row.leadTimeDays.trim() && parseWhole(row.leadTimeDays, 0) === null) errors.leadTimeDays = 'Whole days'
  if (row.unitCbm.trim() && (parseDecimal(row.unitCbm, 6) === null || Number(row.unitCbm) <= 0)) errors.unitCbm = 'Above 0, up to 6 decimals'
  if (row.dutyPercent.trim() && (parseDecimal(row.dutyPercent, 2) === null || Number(row.dutyPercent) > 100)) errors.dutyPercent = '0 to 100'
  return errors
}

/** Two rows of the same supplier and packaging cannot both be saved. */
export function duplicateKeys(rows: QuoteRow[]): Set<string> {
  const seen = new Set<string>()
  const dupes = new Set<string>()
  for (const row of rows) {
    const key = rowKey(row)
    if (seen.has(key)) dupes.add(key)
    seen.add(key)
  }
  return dupes
}

/* ─────────────── Landed cost ─────────────── */

/** Landed = FOB + unit CBM x freight per CBM + FOB x duty % + clearing; the server uses the same rule. */
export interface Landed {
  freight: number
  duty: number
  clearing: number
  landed: number
}

const cents = (value: number) => Math.round(value * 100) / 100

export function landedFor(row: Pick<QuoteRow, 'unitPrice' | 'unitCbm' | 'dutyPercent'>, settings: PriceFamilySettings): Landed | null {
  if (!settings.landedEnabled || settings.freightPerCbm === null) return null
  const fob = parsePrice(row.unitPrice)
  const cbm = row.unitCbm.trim() ? parseDecimal(row.unitCbm, 6) : null
  if (fob === null || cbm === null || cbm <= 0) return null
  const dutyTyped = row.dutyPercent.trim() ? parseDecimal(row.dutyPercent, 2) : null
  const duty = dutyTyped ?? settings.defaultDutyPercent ?? 0
  const freight = cents(cbm * settings.freightPerCbm)
  const dutyAmount = cents((fob * duty) / 100)
  const clearing = settings.clearingPerUnit ?? 0
  return { freight, duty: dutyAmount, clearing, landed: cents(fob + freight + dutyAmount + clearing) }
}

export type RankBasis = 'FOB' | 'LANDED'

export interface RankedRow extends QuoteRow {
  /** The saved quote's rejection, if an approver turned it down. */
  rejection?: { by: { id: number; name: string | null }; at: string; reason: string | null } | null
  /** The FOB price. */
  price: number | null
  landed: Landed | null
  /** The figure the row is ranked on: landed cost when that basis is on and known, otherwise FOB. */
  basisPrice: number | null
  /** 1 = cheapest among rows with a price on the ranking basis; null while it is missing. */
  rank: number | null
  vsLowestPercent: number | null
}

/**
 * Ranks rows on the chosen basis as they are typed (equal prices keep row order). On the landed basis a row without a
 * landed cost (no CBM yet) has no rank rather than a misleading one.
 */
export function rankRows(rows: QuoteRow[], settings: PriceFamilySettings, basis: RankBasis): RankedRow[] {
  const useLanded = basis === 'LANDED' && settings.landedEnabled
  const measured = rows.map((row) => {
    const price = parsePrice(row.unitPrice)
    const landed = landedFor(row, settings)
    return { price, landed, basisPrice: useLanded ? (landed?.landed ?? null) : price }
  })
  const priced = measured.map((item, index) => ({ index, value: item.basisPrice })).filter((item): item is { index: number; value: number } => item.value !== null)
  priced.sort((a, b) => a.value - b.value || a.index - b.index)
  const rankOf = new Map(priced.map((item, position) => [item.index, position + 1]))
  const lowest = priced[0]?.value ?? null
  return rows.map((row, index) => {
    const item = measured[index]
    return {
      ...row,
      price: item.price,
      landed: item.landed,
      basisPrice: item.basisPrice,
      rank: rankOf.get(index) ?? null,
      vsLowestPercent: item.basisPrice !== null && lowest ? Math.round(((item.basisPrice - lowest) / lowest) * 1000) / 10 : null,
    }
  })
}

const numberOrNull = (value: string, parse: (text: string) => number | null): number | null => (value.trim() ? parse(value) : null)

export function toBody(form: PriceAnalysisForm, loadedAt: string | null): PriceAnalysisBody {
  return {
    material: form.material.trim() || null,
    currency: form.currency,
    quotes: form.rows.map((row) => ({
      supplierId: row.supplier.id,
      packagingOption: row.packagingOption.trim(),
      moq: numberOrNull(row.moq, (text) => parseWhole(text, 1)),
      leadTimeDays: numberOrNull(row.leadTimeDays, (text) => parseWhole(text, 0)),
      unitCbm: numberOrNull(row.unitCbm, (text) => parseDecimal(text, 6)),
      dutyPercent: numberOrNull(row.dutyPercent, (text) => parseDecimal(text, 2)),
      contactName: row.contactName.trim() || null,
      remarks: row.remarks.trim() || null,
      sample: row.sample,
      unitPrice: parsePrice(row.unitPrice) ?? 0,
    })),
    expectedUpdatedAt: loadedAt,
  }
}

export const formatMoney = (value: number, currency: string): string =>
  `${currency === 'CAD' ? 'CA$' : '$'}${value.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const formatVsLowest = (percent: number | null): string => (percent === null ? '' : percent === 0 ? '—' : `+${percent.toFixed(1)}%`)

/** A variant as the chips show it: colour and size, falling back to its name. */
export const variantLabel = (variant: { color: string | null; sizeName: string | null; variantName: string | null; name: string }): string =>
  [variant.color, variant.sizeName].filter(Boolean).join(' · ') || variant.variantName || variant.name
