import { useCallback, useMemo } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useGetAmazonPricingQuery, type AmazonPricingRow, type PricingCountry } from '@/services/api/amazonPricing.api'
import { calculatePricing, type Fulfillment, type PricingResult, type SessionMode } from './amazonPricing.calc'

/** The values above the table: they set every row that has no edit of its own. Percentages are whole numbers (5 = 5%). */
export interface PricingGlobals {
  sessionMode: SessionMode
  fulfillment: 'All' | Fulfillment
  daysInStock: number
  overheadPct: number
  marketingPct: number
  promoPct: number
}

export const DEFAULT_GLOBALS: PricingGlobals = { sessionMode: 'Weighted Average', fulfillment: 'All', daysInStock: 45, overheadPct: 5, marketingPct: 5, promoPct: 0 }

/** The cells a row lets the user change; anything not changed follows the listing's data or the globals. */
export type EditableField =
  | 'sellingPrice'
  | 'landedCost'
  | 'commissionPct'
  | 'fbaFee'
  | 'daysInStock'
  | 'overheadPct'
  | 'marketingPct'
  | 'promoPct'
  | 'returnPct'
  | 'shippingCost'
  | 'netTakeHome'
  | 'targetPct'

export type RowEdits = Partial<Record<EditableField, number>> & { sessionMode?: SessionMode }

/** What the sheet assumes when nothing says otherwise. */
const DEFAULT_COMMISSION_PCT = 15
const DEFAULT_RETURN_PCT = 3
const DEFAULT_TARGET_PCT = 15

export interface PricingLine {
  key: string
  row: AmazonPricingRow
  /** Each editable cell's value now: the edit, else the default. */
  values: Record<EditableField, number | null>
  edited: ReadonlySet<EditableField>
  /** This row's Season / Mode: its own pick, else the applied filter's. */
  sessionMode: SessionMode
  sessionModeEdited: boolean
  result: PricingResult
  /** The sheet's "Duplicate" flag: the SKU is listed more than once (FBA and FBM). */
  duplicate: boolean
}


const rowKey = (row: AmazonPricingRow) => `${row.sku}|${row.fulfillment}`

function defaultsOf(row: AmazonPricingRow, globals: PricingGlobals): Record<EditableField, number | null> {
  return {
    sellingPrice: row.currentPrice,
    landedCost: row.landedCost,
    commissionPct: row.referralRate === null ? DEFAULT_COMMISSION_PCT : Math.round(row.referralRate * 10_000) / 100,
    fbaFee: row.fbaFee,
    daysInStock: globals.daysInStock,
    overheadPct: globals.overheadPct,
    marketingPct: globals.marketingPct,
    promoPct: globals.promoPct,
    returnPct: DEFAULT_RETURN_PCT,
    shippingCost: null,
    netTakeHome: null,
    targetPct: DEFAULT_TARGET_PCT,
  }
}

const search = (row: AmazonPricingRow, term: string) => [row.sku, row.parentSku, row.asin, row.title].some((value) => value?.toLowerCase().includes(term))

/**
 * The Amazon tab's rows worked out live: the marketplace's listings, the filters above the table and every edit made in
 * it, run through the sheet's formulas. The applied filters (shared by every marketplace) and the edits (per marketplace)
 * are kept in this browser; mount it with a `key` of the country.
 */
export function useAmazonPricing(country: PricingCountry, searchTerm: string) {
  const query = useGetAmazonPricingQuery(country)
  // The applied filters are shared by every marketplace; the edits made in the table belong to one
  const [savedGlobals, setSavedGlobals] = useLocalStorage<PricingGlobals>('breakeven-amazon:filters', DEFAULT_GLOBALS)
  const [edits, setEdits] = useLocalStorage<Record<string, RowEdits>>(`breakeven-amazon:edits:${country}`, {})
  const globals = useMemo(() => ({ ...DEFAULT_GLOBALS, ...savedGlobals }), [savedGlobals])

  /** Applies the filters picked above the table (the Apply Filters button). */
  const applyGlobals = useCallback((next: PricingGlobals) => setSavedGlobals(next), [setSavedGlobals])

  /** Keeps a row's edits, or drops the row once nothing is edited in it. */
  const commit = useCallback(
    (key: string, row: RowEdits) => {
      const next = { ...edits }
      if (Object.keys(row).length) next[key] = row
      else delete next[key]
      setEdits(next)
    },
    [edits, setEdits],
  )

  /** Sets one cell of one row; `undefined` clears the edit so the cell follows its default again. */
  const setEdit = useCallback(
    (key: string, field: EditableField, value: number | undefined) => {
      const row = { ...edits[key] }
      if (value === undefined) delete row[field]
      else row[field] = value
      commit(key, row)
    },
    [edits, commit],
  )

  /** Sets one row's Season / Mode; `undefined` (or the applied filter's own value) makes it follow the filter again. */
  const setMode = useCallback(
    (key: string, mode: SessionMode | undefined) => {
      const row = { ...edits[key] }
      if (mode === undefined || mode === globals.sessionMode) delete row.sessionMode
      else row.sessionMode = mode
      commit(key, row)
    },
    [edits, commit, globals.sessionMode],
  )

  const resetEdits = useCallback(() => setEdits({}), [setEdits])

  const rates = query.data?.storageRates
  const lines = useMemo<PricingLine[]>(() => {
    if (!query.data || !rates) return []
    const copies = new Map<string, number>()
    for (const row of query.data.rows) copies.set(row.sku, (copies.get(row.sku) ?? 0) + 1)

    return query.data.rows.map((row) => {
      const key = rowKey(row)
      const { sessionMode: ownMode, ...own } = edits[key] ?? {}
      const sessionMode = ownMode ?? globals.sessionMode
      const values = { ...defaultsOf(row, globals), ...own } as Record<EditableField, number | null>
      const pct = (value: number | null) => (value === null ? null : value / 100)
      const result = calculatePricing(
        {
          fulfillment: row.fulfillment,
          dimensions: row.dimensions,
          weight: row.weight,
          sessionMode,
          daysInStock: values.daysInStock ?? 0,
          landedCost: values.landedCost,
          sellingPrice: values.sellingPrice,
          overheadRate: pct(values.overheadPct) ?? 0,
          commissionRate: pct(values.commissionPct),
          fbaFee: values.fbaFee,
          marketingRate: pct(values.marketingPct) ?? 0,
          promoRate: pct(values.promoPct) ?? 0,
          returnRate: pct(values.returnPct) ?? 0,
          shippingCost: values.shippingCost,
          netTakeHome: values.netTakeHome,
          targetMargin: pct(values.targetPct) ?? 0,
        },
        rates,
      )
      return { key, row, values, edited: new Set(Object.keys(own) as EditableField[]), sessionMode, sessionModeEdited: ownMode !== undefined, result, duplicate: (copies.get(row.sku) ?? 0) > 1 }
    })
  }, [query.data, rates, edits, globals])

  const term = searchTerm.trim().toLowerCase()
  const visible = useMemo(
    () => lines.filter((line) => (globals.fulfillment === 'All' || line.row.fulfillment === globals.fulfillment) && (!term || search(line.row, term))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lines, globals.fulfillment, term],
  )

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    globals,
    applyGlobals,
    setEdit,
    setMode,
    resetEdits,
    editedCount: Object.keys(edits).length,
    lines: visible,
  }
}
