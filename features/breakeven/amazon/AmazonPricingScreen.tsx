'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import { MultiSelectInput } from '@/components/multi-select-input/MultiSelectInput'
import { NumericInput } from '@/components/form-field/NumericInput'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { PageHeader } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import type { PricingCountry } from '@/services/api/amazonPricing.api'
import { useDebounce } from '@/utils/debounce'
import { cn } from '@/utils/cn'
import { PRICING_COLUMNS, type ColumnContext } from './amazonPricingColumns'
import type { Fulfillment, SessionMode } from './amazonPricing.calc'
import { useAmazonPricing, type PricingGlobals } from './useAmazonPricing'
import { ApplyFiltersButton } from '@/features/profit/dashboard/components/ApplyFiltersButton'

/**
 * Breakeven Analysis > Amazon: the "Price & Profit Analysis" sheet as a screen. Every listing of the marketplace with its
 * costs, fees, break-even and recommended price, worked out live: apply the filters above or change any editable cell and the
 * columns to its right follow. Edits are kept in this browser; they are what-ifs and change nothing in Amazon.
 */

const PAGE_SIZE = 50

const COUNTRY_OPTIONS = [
  { id: 'CA', name: 'Canada (CAD)' },
  { id: 'US', name: 'USA (USD)' },
  { id: 'MX', name: 'Mexico (MXN)' },
]
const SESSION_OPTIONS: { id: SessionMode; name: string }[] = [
  { id: 'Off-Peak', name: 'Off Peak' },
  { id: 'On-Peak', name: 'On Peak' },
  { id: 'Weighted Average', name: 'Weighted Average' },
]
const FULFILLMENT_OPTIONS: { id: PricingGlobals['fulfillment']; name: string }[] = [
  { id: 'All', name: 'FBA + FBM' },
  { id: 'FBA', name: 'FBA' },
  { id: 'FBM', name: 'FBM' },
]

/** The columns that stay put at the left, and how far from the edge each one sits. */
const FROZEN = PRICING_COLUMNS.filter((column) => column.frozen)
const FROZEN_LEFT = FROZEN.map((_, index) => FROZEN.slice(0, index).reduce((sum, column) => sum + column.width, 0))
const TABLE_WIDTH = PRICING_COLUMNS.reduce((sum, column) => sum + column.width, 0)

export const AmazonPricingScreen: React.FC = () => {
  const [country, setCountry] = useState<PricingCountry>('CA')
  // the board keeps its filters and edits per marketplace, so each marketplace gets its own
  return <AmazonPricingBoard key={country} country={country} onCountryChange={setCountry} />
}

const AmazonPricingBoard: React.FC<{ country: PricingCountry; onCountryChange: (country: PricingCountry) => void }> = ({ country, onCountryChange }) => {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search.trim(), 300)
  const [page, setPage] = useState(1)
  const { data, isLoading, isFetching, error, globals, applyGlobals, setEdit, setMode, resetEdits, editedCount, lines } = useAmazonPricing(country, debouncedSearch)

  // The filters are picked as a draft and take effect together when Apply Filters is pressed (search applies as you type)
  const [draft, setDraft] = useState<PricingGlobals>(globals)
  const [draftCountry, setDraftCountry] = useState<PricingCountry>(country)
  const update = <K extends keyof PricingGlobals>(key: K, value: PricingGlobals[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const filterPending = draftCountry !== country || (Object.keys(draft) as Array<keyof PricingGlobals>).some((key) => draft[key] !== globals[key])
  const applyFilters = () => {
    applyGlobals(draft)
    if (draftCountry !== country) onCountryChange(draftCountry)
  }

  // a new search or filter starts from the first page
  useEffect(() => setPage(1), [debouncedSearch, globals.fulfillment])

  const totalPages = Math.max(1, Math.ceil(lines.length / PAGE_SIZE))
  const pageLines = useMemo(() => lines.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [lines, page])
  const context = useMemo<ColumnContext>(() => ({ currency: data?.currency ?? "CAD", globals, setEdit, setMode }), [data?.currency, globals, setEdit, setMode])

  const rates = data?.storageRates
  const rateNote =
    rates && (globals.sessionMode === 'Weighted Average' ? 'Weighted average: 9 months off-peak, 3 on-peak' : globals.sessionMode)

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader
        title="Breakeven Analysis · Amazon"
        description="Price and profit by listing: change a filter or any highlighted cell and the figures to its right update live"
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search SKU, parent, ASIN, title..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-lg border border-border bg-surface-primary py-2 pl-10 pr-3 text-sm text-text-primary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="min-w-[160px] shrink-0">
            <MultiSelectInput single title="Marketplace" options={COUNTRY_OPTIONS} value={[draftCountry]} onChange={(value) => value[0] && setDraftCountry(value[0] as PricingCountry)} />
          </div>
          <div className="min-w-[170px] shrink-0">
            <MultiSelectInput single title="Session mode" options={SESSION_OPTIONS} value={[draft.sessionMode]} onChange={(value) => value[0] && update('sessionMode', value[0] as SessionMode)} />
          </div>
          <div className="min-w-[130px] shrink-0">
            <MultiSelectInput
              single
              title="Fulfilment"
              options={FULFILLMENT_OPTIONS}
              value={[draft.fulfillment]}
              onChange={(value) => value[0] && update('fulfillment', value[0] as Fulfillment | 'All')}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <GlobalInput id="days" label="Days in stock" value={draft.daysInStock} onChange={(value) => update('daysInStock', value)} onEnter={applyFilters} />
          <GlobalInput id="overhead" label="Operation overhead" suffix="%" value={draft.overheadPct} onChange={(value) => update('overheadPct', value)} onEnter={applyFilters} />
          <GlobalInput id="marketing" label="Marketing" suffix="%" value={draft.marketingPct} onChange={(value) => update('marketingPct', value)} onEnter={applyFilters} />
          <GlobalInput id="promo" label="Promo discount" suffix="%" value={draft.promoPct} onChange={(value) => update('promoPct', value)} onEnter={applyFilters} />

          <div className="flex-1" />
          {editedCount > 0 && (
            <Button type="button" size="sm" variant="outline" onClick={resetEdits}>
              Reset {editedCount} edited {editedCount === 1 ? 'row' : 'rows'}
            </Button>
          )}
          <ApplyFiltersButton onClick={applyFilters} pending={filterPending} disabled={isFetching && !filterPending} />
        </div>

        <p className="text-xs text-text-muted">
          Storage per cubic metre · {rateNote}
          {rates && ` · ${rates.source === 'amazon' ? 'rates Amazon billed' : 'published rates where Amazon has not billed yet'}`}
          {data && !data.feesSyncedAt && ' · Amazon fee preview not synced yet: dimensions and FBA fees are blank'}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <div className={cn('max-h-[calc(100vh-330px)] min-h-[320px] overflow-auto rounded-t-xl', isFetching && !isLoading && 'opacity-70 transition-opacity')}>
          <table className="border-separate border-spacing-0 text-sm" style={{ tableLayout: 'fixed', width: TABLE_WIDTH }}>
            <colgroup>
              {PRICING_COLUMNS.map((column) => (
                <col key={column.id} style={{ width: column.width }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {PRICING_COLUMNS.map((column) => (
                  <th key={column.id} scope="col" style={frozenStyle(column, 'head')} className={cn(HEAD, ALIGN[column.align ?? 'right'], column.id === FROZEN[FROZEN.length - 1].id && EDGE)}>
                    <span className="block leading-tight">{column.header}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <StatusRow>Loading listings…</StatusRow>
              ) : error ? (
                <StatusRow tone="danger">Could not load the listings. Please try again.</StatusRow>
              ) : pageLines.length === 0 ? (
                <StatusRow>{debouncedSearch ? 'No listings match your search.' : 'No listings for this marketplace.'}</StatusRow>
              ) : (
                pageLines.map((line) => (
                  <tr key={line.key} className="group">
                    {PRICING_COLUMNS.map((column) => (
                      <td key={column.id} style={frozenStyle(column, 'body')} className={cn(CELL, ALIGN[column.align ?? 'right'], column.frozen ? 'bg-surface' : 'group-hover:bg-secondary-50', column.id === FROZEN[FROZEN.length - 1].id && EDGE)}>
                        {column.cell(line, context)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {lines.length > 0 && (
          <PaginationFooter page={page} pageSize={PAGE_SIZE} totalItems={lines.length} totalPages={totalPages} onPageChange={setPage} itemLabel="listings" />
        )}
      </div>
    </div>
  )
}

const HEAD = 'border-b border-border bg-surface px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-text-muted'
const CELL = 'overflow-hidden border-b border-border/60 px-3 py-2 align-middle whitespace-nowrap'
const EDGE = 'border-r border-border shadow-[2px_0_4px_rgba(0,0,0,0.05)]'
const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' } as const

/**
 * The first two columns stick to the left, each after the one before; the header row sticks to the top. Corner cells sit
 * above the rest so the other columns pass behind them.
 */
function frozenStyle(column: (typeof PRICING_COLUMNS)[number], part: 'head' | 'body'): React.CSSProperties | undefined {
  const index = FROZEN.findIndex((frozen) => frozen.id === column.id)
  if (part === 'head') return { position: 'sticky', top: 0, left: index === -1 ? undefined : FROZEN_LEFT[index], zIndex: index === -1 ? 20 : 40 }
  return index === -1 ? undefined : { position: 'sticky', left: FROZEN_LEFT[index], zIndex: 10 }
}

const StatusRow: React.FC<{ children: React.ReactNode; tone?: 'danger' }> = ({ children, tone }) => (
  <tr>
    <td colSpan={PRICING_COLUMNS.length} className="p-0">
      <div className={cn('sticky left-0 flex min-h-[16rem] w-full max-w-[100vw] items-center justify-center px-4 text-sm', tone === 'danger' ? 'text-danger-600' : 'text-text-muted')}>{children}</div>
    </td>
  </tr>
)

/** A number above the table: digits only, so never negative; emptied, it counts as zero. */
const GlobalInput: React.FC<{ id: string; label: string; suffix?: string; value: number; onChange: (value: number) => void; onEnter: () => void }> = ({ id, label, suffix, value, onChange, onEnter }) => {
  // the typed text is kept as typed ("5." stays "5.") while the number it stands for is what the board uses
  const [draft, setDraft] = useState(String(value))
  return (
    <div className="flex items-center">
      <label htmlFor={id} className="whitespace-nowrap rounded-l-lg bg-primary-500 px-3 py-2.5 text-sm text-white">
        {label}
        {suffix ? ` ${suffix}` : ''}
      </label>
      <NumericInput
        id={id}
        decimal
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value)
          onChange(parseFloat(event.target.value) || 0)
        }}
        onBlur={() => setDraft(String(value))}
        onKeyDown={(event) => event.key === 'Enter' && onEnter()}
        className="w-20 rounded-r-lg border border-border bg-surface-primary px-2 py-2.5 text-center text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>
  )
}
