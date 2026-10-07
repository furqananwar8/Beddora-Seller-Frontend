import type { PoCurrency, PriceAnalysisBody, PriceAnalysisView, SupplierRef } from '@/services/api/procurement.api'

/** Cards on the screen: the cheapest five. Rows after that are kept but get no card. */
export const TOP_RANKS = 5

export interface QuoteRow {
  supplier: Pick<SupplierRef, 'id' | 'name' | 'contactName'>
  /** Point of contact for this quote; starts as the supplier's own contact. */
  contactName: string
  remarks: string
  /** As typed. */
  unitPrice: string
}

export interface PriceAnalysisForm {
  material: string
  currency: PoCurrency
  rows: QuoteRow[]
}

export type RowErrors = Partial<Record<'contactName' | 'remarks' | 'unitPrice' | 'supplierId', string>>

/** The saved analysis as form values; a product without one starts from its own material. */
export function formFrom(view: PriceAnalysisView): PriceAnalysisForm {
  const analysis = view.analysis
  if (!analysis) return { material: view.product.material ?? '', currency: 'USD', rows: [] }
  return {
    material: analysis.material ?? '',
    currency: analysis.currency,
    rows: analysis.quotes.map((quote) => ({
      supplier: { id: quote.supplier.id, name: quote.supplier.name, contactName: quote.supplier.contactName },
      contactName: quote.contactName ?? '',
      remarks: quote.remarks ?? '',
      unitPrice: quote.unitPrice.toFixed(2),
    })),
  }
}

export const sameForm = (a: PriceAnalysisForm, b: PriceAnalysisForm): boolean => JSON.stringify(a) === JSON.stringify(b)

/** A price as typed, or null while it is not a usable amount yet. */
export function parsePrice(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  const price = Number(trimmed)
  return price > 0 && price <= 999_999_999 ? price : null
}

export function rowError(row: QuoteRow): RowErrors {
  const errors: RowErrors = {}
  if (row.unitPrice.trim() === '') errors.unitPrice = 'Enter a price'
  else if (parsePrice(row.unitPrice) === null) errors.unitPrice = 'Enter an amount above 0 with at most 2 decimals'
  if (row.contactName.length > 120) errors.contactName = 'Contact name is too long'
  if (row.remarks.length > 500) errors.remarks = 'Remarks are too long'
  return errors
}

export interface RankedRow extends QuoteRow {
  /** The saved quote's rejection, if an approver turned it down. */
  rejection?: { by: { id: number; name: string | null }; at: string; reason: string | null } | null
  price: number | null
  /** 1 = cheapest among rows with a price; null while the price is missing. */
  rank: number | null
  vsLowestPercent: number | null
}

/** Ranks rows by price as they are typed (equal prices keep row order), the same rule the server uses. */
export function rankRows(rows: QuoteRow[]): RankedRow[] {
  const priced = rows.map((row, index) => ({ index, price: parsePrice(row.unitPrice) })).filter((item): item is { index: number; price: number } => item.price !== null)
  priced.sort((a, b) => a.price - b.price || a.index - b.index)
  const rankOf = new Map(priced.map((item, position) => [item.index, position + 1]))
  const lowest = priced[0]?.price ?? null
  return rows.map((row, index) => {
    const price = parsePrice(row.unitPrice)
    return {
      ...row,
      price,
      rank: rankOf.get(index) ?? null,
      vsLowestPercent: price !== null && lowest ? Math.round(((price - lowest) / lowest) * 1000) / 10 : null,
    }
  })
}

export function toBody(form: PriceAnalysisForm, loadedAt: string | null): PriceAnalysisBody {
  return {
    material: form.material.trim() || null,
    currency: form.currency,
    quotes: form.rows.map((row) => ({ supplierId: row.supplier.id, contactName: row.contactName.trim() || null, remarks: row.remarks.trim() || null, unitPrice: parsePrice(row.unitPrice) ?? 0 })),
    expectedUpdatedAt: loadedAt,
  }
}

export const formatMoney = (value: number, currency: string): string =>
  `${currency === 'CAD' ? 'CA$' : '$'}${value.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const formatVsLowest = (percent: number | null): string => (percent === null ? '' : percent === 0 ? '—' : `+${percent.toFixed(1)}%`)
