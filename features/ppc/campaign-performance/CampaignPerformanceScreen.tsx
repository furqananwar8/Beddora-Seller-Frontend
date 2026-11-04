'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns'
import { Search } from 'lucide-react'
import DateRangePicker, { type DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { Container } from '@/components/layout'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { Button } from '@/design-system/buttons'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useDebounce } from '@/hooks/useDebounce'
import { useGetCampaignParentsQuery, useGetParentKeywordsQuery } from '@/services/api/campaignPerformance.api'
import { KeywordGrid } from './KeywordGrid'
import { MetricLegend } from './MetricLegend'
import { ParentSkuList } from './ParentSkuList'

/** Same cap as the server: a month of day columns stays readable. */
const MAX_RANGE_DAYS = 31
const PAGE_SIZE = 50

interface Filters extends Record<string, unknown> {
  range: DateRangeValue
  keyword: string
}

const day = (date: Date) => format(date, 'yyyy-MM-dd')

const defaultFilters = (): Filters => ({
  range: { startDate: day(subDays(new Date(), 9)), endDate: day(new Date()) },
  keyword: '',
})

/**
 * Campaign Performance: parent SKUs on the left; for the chosen parent, each tracked keyword with its campaign and
 * spend, the parent's SKUs under it, and a column per day showing the keyword's rank for that SKU above the day's
 * budget, spend, sales, units, PPC sales, PPC units and price. Filters apply with the button.
 */
export const CampaignPerformanceScreen: React.FC = () => {
  const { info } = useApiFeedback()
  const defaults = useMemo(defaultFilters, [])
  const { draft, setDraft, applied, apply, reset, changed, activeCount } = useStagedFilters(defaults)
  const [parentSearch, setParentSearch] = useState('')
  const debouncedParentSearch = useDebounce(parentSearch, 300)
  const [selected, setSelected] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const startDate = applied.range.startDate ?? ''
  const endDate = applied.range.endDate ?? ''
  const ready = Boolean(startDate && endDate)

  const { data: parents = [], isLoading: parentsLoading } = useGetCampaignParentsQuery(
    { startDate, endDate, search: debouncedParentSearch || undefined },
    { skip: !ready }
  )
  const activeParent = selected ?? parents[0]?.parentSku ?? null

  useEffect(() => setPage(1), [activeParent, applied])

  const { data, isFetching, isError } = useGetParentKeywordsQuery(
    { parentSku: activeParent ?? '', startDate, endDate, search: applied.keyword || undefined, page, limit: PAGE_SIZE },
    { skip: !ready || !activeParent }
  )

  const onRangeChange = (next: DateRangeValue) => {
    if (next.startDate && next.endDate && differenceInCalendarDays(parseISO(next.endDate), parseISO(next.startDate)) + 1 > MAX_RANGE_DAYS) {
      info(`Campaign Performance covers at most ${MAX_RANGE_DAYS} days: the range ends ${day(subDays(parseISO(next.startDate), -(MAX_RANGE_DAYS - 1)))}.`)
      setDraft('range', { ...next, endDate: day(subDays(parseISO(next.startDate), -(MAX_RANGE_DAYS - 1))), presetId: null })
      return
    }
    setDraft('range', next)
  }

  return (
    <Container size="full" className="py-4 sm:py-6">
      <h1 className="mb-4 px-2 pb-1 pt-2 text-xl font-bold text-text-primary sm:text-2xl">Campaign Performance</h1>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-3 shadow-sm">
        <DateRangePicker value={draft.range} onChange={onRangeChange} placeholder="Pick a date range" disableFutureDates triggerClassName="h-11 py-0" />
        <label className="flex min-w-[220px] flex-1 items-center gap-2 h-11 rounded-lg border border-border px-3 text-sm text-text-muted focus-within:border-primary-500">
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          <input
            value={draft.keyword}
            onChange={(event) => setDraft('keyword', event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && apply()}
            placeholder={activeParent ? `Search keywords in ${activeParent}` : 'Search keywords'}
            className="min-w-0 flex-1 bg-transparent text-text-primary outline-none placeholder:text-text-muted"
          />
        </label>
        <Button type="button" size="sm" className="h-11 px-5" disabled={changed.size === 0} onClick={apply}>
          Apply
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-11 px-5" disabled={activeCount === 0} onClick={reset}>
          Clear
        </Button>
      </div>

      <div className="flex h-[calc(100vh-14rem)] min-h-[420px] gap-3">
        <ParentSkuList
          parents={parents}
          selected={activeParent}
          search={parentSearch}
          isLoading={parentsLoading}
          onSearch={setParentSearch}
          onSelect={setSelected}
        />

        <section className="flex min-w-0 flex-1 flex-col rounded-lg border border-border bg-surface shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">
              Keyword Rank History <span className="font-normal text-text-muted">(Latest First)</span>
              {data && <span className="font-normal text-text-muted"> · {data.days.length} days</span>}
            </h2>
            <MetricLegend />
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {!activeParent && !parentsLoading && <p className="p-8 text-center text-sm text-text-muted">No parent SKU to show.</p>}
            {isError && <p className="p-8 text-center text-sm text-red-600">Could not load the keywords. Try again.</p>}
            {isFetching && !data && <p className="p-8 text-center text-sm text-text-muted">Loading…</p>}
            {data && data.items.length === 0 && !isFetching && (
              <p className="p-8 text-center text-sm text-text-muted">No tracked keywords for this parent SKU in the period.</p>
            )}
            {data && data.items.length > 0 && <KeywordGrid data={data} />}
          </div>

          {data && data.total > 0 && (
            <div className="border-t border-border px-3 py-1 text-xs text-text-muted">
              Showing {(data.page - 1) * data.limit + 1} to {Math.min(data.page * data.limit, data.total)} of {data.total} keywords
              <PaginationFooter
                page={data.page}
                pageSize={data.limit}
                totalItems={data.total}
                totalPages={Math.ceil(data.total / data.limit)}
                onPageChange={setPage}
                itemLabel="keywords"
              />
            </div>
          )}
        </section>
      </div>
    </Container>
  )
}
