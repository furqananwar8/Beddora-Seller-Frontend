'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import DateRangePicker from '@/components/date-range-picker/DateRangePicker'
import { FILL_TOGGLE, FilterBar, FilterItem } from '@/components/filter-bar/FilterBar'
import { FilterMultiSelect } from '@/components/filter-bar/FilterMultiSelect'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { FormField } from '@/components/form-field/FormField'
import { Container } from '@/components/layout'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useGetCashflowPlanningQuery, type CashflowGrouping } from '@/services/api/finance.api'
import { cn } from '@/utils/cn'
import { CashflowEntriesModal, type CashflowSelection } from './CashflowEntriesModal'
import { CashflowTable } from './CashflowTable'
import {
  CASHFLOW_PRESETS,
  CURRENCY_OPTIONS,
  defaultFilters,
  filtersFromParams,
  filtersToParams,
  GROUPING_OPTIONS,
  MAX_RANGE_DAYS,
  PAYMENT_OPTIONS,
  rangeDays,
  withinCap,
  type CashflowFilters,
  type PaymentChoice,
} from './cashflowFilters'

/** The date picker fills its filter box like the other controls. */
const PICKER_BOX = 'rounded-lg [&>div]:block [&>div]:w-full [&>div>button]:h-10 [&>div>button]:w-full [&>div>button]:py-0 [&>div>button>span]:flex-1 [&>div>button>span]:text-left'

/**
 * Cashflow planning: every approved payment request, paid or not, under its due date (up to two months, per day, week
 * or month). Green is paid, red still owed, orange a total that mixes both. Filters apply with the button and stay in
 * the page address, so opening a payment's details and pressing Back returns to the same grid.
 */
export const CashflowPlanningScreen: React.FC = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { info } = useApiFeedback()
  const defaults = useMemo(defaultFilters, [])
  // Read once: afterwards the screen writes the address, not the other way round
  const [initial] = useState(() => filtersFromParams(new URLSearchParams(searchParams.toString())))
  const keepInAddress = useCallback((next: CashflowFilters) => router.replace(`${pathname}?${filtersToParams(next)}`, { scroll: false }), [pathname, router])
  const filters = useStagedFilters(defaults, keepInAddress, initial)
  const { draft, setDraft, applied, changed } = filters
  const [selection, setSelection] = useState<CashflowSelection | null>(null)

  const { range, groupBy, currencies, payment } = applied
  const ready = Boolean(range.startDate && range.endDate)
  const { data, isLoading, isFetching, isError } = useGetCashflowPlanningQuery(
    { from: range.startDate ?? '', to: range.endDate ?? '', groupBy, currencies, payment: payment || undefined },
    { skip: !ready }
  )
  const returnTo = `${pathname}?${filtersToParams(applied)}`

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 px-1 sm:mb-6">
        <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Cashflow Planning</h1>
        <p className="mt-1 text-sm text-text-muted">Approved payment requests by due date, paid or not. Click an amount to see the requests in it.</p>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-primary">Filters</h2>
          <p className="text-xs text-text-muted">Pick a range of up to 2 months, then apply</p>
        </div>
        <FilterBar pendingCount={changed.size} activeCount={filters.activeCount} onApply={filters.apply} onReset={filters.reset}>
          <FilterItem wide>
            <FormField label="Date range">
              <div className={cn(PICKER_BOX, changed.has('range') && 'ring-1 ring-primary-500')}>
                <DateRangePicker
                  value={draft.range}
                  presets={CASHFLOW_PRESETS}
                  onChange={(next) => {
                    const capped = withinCap(next)
                    if (capped !== next) info(`Cashflow covers at most 2 months (${MAX_RANGE_DAYS} days): the range ends ${capped.endDate}.`)
                    setDraft('range', capped)
                  }}
                  placeholder="Pick a date range"
                />
              </div>
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="View by">
              <SegmentedToggle<CashflowGrouping>
                ariaLabel="View by"
                value={draft.groupBy}
                onChange={(value) => setDraft('groupBy', value)}
                options={GROUPING_OPTIONS}
                className={cn(FILL_TOGGLE, changed.has('groupBy') && 'ring-1 ring-primary-500')}
              />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Invoice currency" htmlFor="cashflow-currency">
              <FilterMultiSelect
                id="cashflow-currency"
                options={CURRENCY_OPTIONS}
                value={draft.currencies}
                onChange={(value) => setDraft('currencies', value)}
                anyLabel="All currencies"
                highlighted={changed.has('currencies')}
              />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Payment">
              <SegmentedToggle<PaymentChoice>
                ariaLabel="Payment"
                value={draft.payment}
                onChange={(value) => setDraft('payment', value)}
                options={PAYMENT_OPTIONS}
                className={cn(FILL_TOGGLE, changed.has('payment') && 'ring-1 ring-primary-500')}
              />
            </FormField>
          </FilterItem>
        </FilterBar>
        {ready && (
          <p className="mt-2 text-xs text-text-muted">
            Showing {rangeDays(range)} {rangeDays(range) === 1 ? 'day' : 'days'} by {groupBy}
          </p>
        )}
      </div>

      <div className={cn(isFetching && !isLoading && 'opacity-70 transition-opacity')}>
        <CashflowTable report={data} isLoading={isLoading} isError={isError} onOpen={setSelection} />
      </div>
      <CashflowEntriesModal selection={selection} returnTo={returnTo} onClose={() => setSelection(null)} />
    </Container>
  )
}
