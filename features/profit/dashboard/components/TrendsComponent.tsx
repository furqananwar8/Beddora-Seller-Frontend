// ── TrendsComponent.tsx ──
'use client'

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/design-system/cards'
import { Spinner } from '@/design-system/loaders'
import { useGetProductTrendsQuery, ProfitFilters } from '@/services/api/profit.api'
import { Input } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { ErrorComponent } from './ErrorComponent'
import { TrendsTable } from './TrendsTable'
import { MetricTabs, TrendMetric } from './MetricTabs'
import { cn } from '@/utils/cn'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { useGetAccountsQuery } from '@/services/api/accounts.api'
import { setFilters } from '@/store/profit.slice'
import {
  format,
  addDays,
  addMonths,
  startOfMonth,
  parseISO,
  getYear,
  getMonth,
} from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TIMEZONE = 'America/Los_Angeles'

const nowInPST = () => toZonedTime(new Date(), TIMEZONE)
const toISODatePST = (date: Date) => format(date, 'yyyy-MM-dd')
const addDaysPST = (date: Date, days: number) => addDays(date, days)

const MARKETPLACES = [
  { id: 'Amazon.ca', name: 'Canada' },
  { id: 'Amazon.com', name: 'USA' },
  { id: 'Amazon.mx', name: 'Mexico' },
]

type Periodicity = 'day' | 'week' | 'month'

interface TrendPreset {
  id: string
  label: string
  getRange: () => { startDate: string; endDate: string; periodicity: Periodicity }
}

const trendPresets: TrendPreset[] = [
  {
    id: 'last-12-months',
    label: 'Last 12 months, by month',
    getRange: () => {
      const end = nowInPST()
      const start = addMonths(end, -12)
      return { startDate: toISODatePST(start), endDate: toISODatePST(end), periodicity: 'month' }
    },
  },
  {
    id: 'last-3-months',
    label: 'Last 3 months, by week',
    getRange: () => {
      const end = nowInPST()
      const start = addMonths(end, -3)
      return { startDate: toISODatePST(start), endDate: toISODatePST(end), periodicity: 'week' }
    },
  },
  {
    id: 'last-30-days',
    label: 'Last 30 days, by day',
    getRange: () => {
      const end = nowInPST()
      const start = addDaysPST(end, -29)
      return { startDate: toISODatePST(start), endDate: toISODatePST(end), periodicity: 'day' }
    },
  },
  {
    id: 'custom',
    label: 'Custom range',
    getRange: () => ({
      startDate: toISODatePST(addDaysPST(nowInPST(), -29)),
      endDate: toISODatePST(nowInPST()),
      periodicity: 'day',
    }),
  },
]

const MarketplaceMultiSelect: React.FC<{
  options: Array<{ id: string; name: string }>
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
}> = ({ options, value, onChange, placeholder = 'Select marketplaces' }) => {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const allRef = useRef<HTMLInputElement>(null)

  const allIds = useMemo(() => options.map((o) => o.id), [options])
  const allSelected = value.length === allIds.length && allIds.length > 0
  const noneSelected = value.length === 0
  const isIndeterminate = !allSelected && !noneSelected

  useEffect(() => {
    if (allRef.current) {
      allRef.current.indeterminate = isIndeterminate
    }
  }, [isIndeterminate])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const toggleAll = () => {
    if (allSelected) onChange([])
    else onChange([...allIds])
  }

  const toggleOne = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id))
    else onChange([...value, id])
  }

  const displayLabel = useMemo(() => {
    if (value.length === 0) return placeholder
    if (value.length === 1) return options.find((o) => o.id === value[0])?.name || placeholder
    if (value.length === options.length) return 'All Marketplaces'
    return `${value.length} selected`
  }, [value, options, placeholder])

  return (
    <div className="relative min-w-[160px]" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-text-primary hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600"
      >
        <span className="truncate">{displayLabel}</span>
        <svg
          className={`w-4 h-4 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] bg-surface border border-border rounded-lg shadow-lg py-1">
          <label className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border cursor-pointer hover:bg-surface-secondary">
            <input
              ref={allRef}
              type="checkbox"
              className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
              checked={allSelected}
              onChange={toggleAll}
            />
            <span className="text-sm font-medium text-text-primary">All Marketplaces</span>
          </label>
          {options.map((opt) => (
            <label
              key={opt.id}
              className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-surface-secondary"
            >
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
                checked={value.includes(opt.id)}
                onChange={() => toggleOne(opt.id)}
              />
              <span className="text-sm text-text-primary">{opt.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

const CalendarGrid: React.FC<{
  year: number
  month: number
  selectedStart?: string
  selectedEnd?: string
  hoverDate?: string
  onDateClick: (date: string) => void
  onHover?: (date: string) => void
}> = ({ year, month, selectedStart, selectedEnd, hoverDate, onDateClick, onHover }) => {
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7

  const days: Array<{ date: string; day: number; isCurrentMonth: boolean }> = []

  const prevMonthDays = new Date(year, month, 0).getDate()
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthDays - i)
    days.push({ date: format(d, 'yyyy-MM-dd'), day: d.getDate(), isCurrentMonth: false })
  }

  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    const d = new Date(year, month, i)
    days.push({ date: format(d, 'yyyy-MM-dd'), day: i, isCurrentMonth: true })
  }

  const remaining = (7 - (days.length % 7)) % 7
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i)
    days.push({ date: format(d, 'yyyy-MM-dd'), day: i, isCurrentMonth: false })
  }

  const isSelected = (date: string) => {
    if (!selectedStart) return false
    if (!selectedEnd) return date === selectedStart
    return date >= selectedStart && date <= selectedEnd
  }

  const isEdge = (date: string) => date === selectedStart || date === selectedEnd

  const isInHover = (date: string) => {
    if (!selectedStart || selectedEnd || !hoverDate || pickingDate !== 'end') return false
    return date >= selectedStart && date <= hoverDate
  }

  return (
    <div className="w-full">
      <div className="text-center font-semibold text-sm mb-2 text-text-primary">
        {format(new Date(year, month), 'MMMM yyyy')}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
          <div key={d} className="text-center text-xs text-text-muted py-1">
            {d}
          </div>
        ))}
        {days.map((day, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => day.isCurrentMonth && onDateClick(day.date)}
            onMouseEnter={() => onHover?.(day.date)}
            className={cn(
              'h-8 w-full text-sm flex items-center justify-center rounded transition-colors',
              !day.isCurrentMonth && 'text-text-muted/30 pointer-events-none',
              day.isCurrentMonth && 'text-text-primary hover:bg-surface-secondary hover:text-white cursor-pointer',
              isInHover(day.date) && 'bg-primary-400 text-white',
              isSelected(day.date) && !isEdge(day.date) && 'bg-primary-500 text-white',
              isEdge(day.date) && 'bg-primary-600 text-white'
            )}
            disabled={!day.isCurrentMonth}
          >
            {day.day}
          </button>
        ))}
      </div>
    </div>
  )
}

let pickingDate: 'start' | 'end' = 'start'

export interface TrendsComponentProps {
  startDate?: string
  endDate?: string
  accountId?: string
  marketplaces?: string[]
  currency?: string
  className?: string
}

export const TrendsComponent: React.FC<TrendsComponentProps> = ({
  startDate: initialStartDate,
  endDate: initialEndDate,
  accountId: initialAccountId,
  marketplaces: initialMarketplaces,
  currency: initialCurrency,
  className,
}) => {
  const dispatch = useAppDispatch()
  const profitFilters = useAppSelector((state) => state.profit.filters)
  const { data: accountsData, isLoading: accountsLoading } = useGetAccountsQuery()

  const [searchTerm, setSearchTerm] = useState('')
  const [metric, setMetric] = useState<TrendMetric>('sales')
  const [heatmapEnabled, setHeatmapEnabled] = useState(false)

  const [selectedPreset, setSelectedPreset] = useState('last-30-days')
  const [isPresetOpen, setIsPresetOpen] = useState(false)
  const [dropdownMode, setDropdownMode] = useState<'simple' | 'custom'>('simple')
  const [periodicity, setPeriodicity] = useState<Periodicity>('day')
  const [tempPeriodicity, setTempPeriodicity] = useState<Periodicity>('day')

  const defaultRange = useMemo(() => trendPresets[2].getRange(), [])
  const [startDate, setStartDate] = useState(initialStartDate || defaultRange.startDate)
  const [endDate, setEndDate] = useState(initialEndDate || defaultRange.endDate)

  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>(
    initialMarketplaces || profitFilters.marketplaces || ['Amazon.ca']
  )
  const [selectedCurrency, setSelectedCurrency] = useState(initialCurrency || 'CAD')

  const [page, setPage] = useState(1)
  const [limit] = useState(20)

  const [calendarViewDate, setCalendarViewDate] = useState(nowInPST())
  const [tempStartDate, setTempStartDate] = useState('')
  const [tempEndDate, setTempEndDate] = useState('')
  const [hoverDate, setHoverDate] = useState('')

  const presetRef = useRef<HTMLDivElement>(null)

  const effectiveAccountId = useMemo(
    () => initialAccountId || profitFilters.accountId || accountsData?.[0]?.id,
    [initialAccountId, profitFilters.accountId, accountsData]
  )

  useEffect(() => {
    if (initialStartDate) setStartDate(initialStartDate)
  }, [initialStartDate])

  useEffect(() => {
    if (initialEndDate) setEndDate(initialEndDate)
  }, [initialEndDate])

  useEffect(() => {
    if (initialMarketplaces) setSelectedMarketplaces(initialMarketplaces)
  }, [initialMarketplaces])

  useEffect(() => {
    if (initialCurrency) setSelectedCurrency(initialCurrency)
  }, [initialCurrency])

  useEffect(() => {
    if (!profitFilters.accountId && accountsData?.length && accountsData[0]?.id) {
      dispatch(setFilters({ ...profitFilters, accountId: accountsData[0].id }))
    }
  }, [accountsData, dispatch, profitFilters])

  const applyPreset = useCallback(
    (presetId: string) => {
      const preset = trendPresets.find((p) => p.id === presetId)
      if (!preset) return

      setSelectedPreset(presetId)
      setPage(1)

      if (presetId !== 'custom') {
        const range = preset.getRange()
        setStartDate(range.startDate)
        setEndDate(range.endDate)
        setPeriodicity(range.periodicity)
        setIsPresetOpen(false)
        setDropdownMode('simple')
      } else {
        setDropdownMode('custom')
        setTempPeriodicity(periodicity)
        setTempStartDate(startDate)
        setTempEndDate(endDate)
        setCalendarViewDate(startOfMonth(parseISO(startDate || toISODatePST(nowInPST()))))
        pickingDate = 'start'
      }
    },
    [startDate, endDate, periodicity]
  )

  const handleDateClick = useCallback(
    (date: string) => {
      if (pickingDate === 'start') {
        setTempStartDate(date)
        setTempEndDate('')
        pickingDate = 'end'
      } else {
        if (date < tempStartDate) {
          setTempStartDate(date)
          setTempEndDate('')
          pickingDate = 'end'
        } else {
          setTempEndDate(date)
          pickingDate = 'start'
        }
      }
    },
    [tempStartDate]
  )

  const applyCustomRange = useCallback(() => {
    if (tempStartDate && tempEndDate) {
      setStartDate(tempStartDate)
      setEndDate(tempEndDate)
      setPeriodicity(tempPeriodicity)
      setPage(1)
      setIsPresetOpen(false)
      setDropdownMode('simple')
    }
  }, [tempStartDate, tempEndDate, tempPeriodicity])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (presetRef.current && !presetRef.current.contains(event.target as Node)) {
        setIsPresetOpen(false)
        setDropdownMode('simple')
      }
    }
    if (isPresetOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isPresetOpen])

  useEffect(() => {
    if (isPresetOpen && dropdownMode === 'custom') {
      setTempPeriodicity(periodicity)
      setTempStartDate(startDate)
      setTempEndDate(endDate)
      setCalendarViewDate(startOfMonth(parseISO(startDate || toISODatePST(nowInPST()))))
      pickingDate = 'start'
    }
  }, [isPresetOpen, dropdownMode, periodicity, startDate, endDate])

  const filters = useMemo<ProfitFilters & { metric?: string; periodicity?: Periodicity; page?: number; limit?: number }>(
    () => ({
      startDate,
      endDate,
      accountId: effectiveAccountId,
      marketplaceId: selectedMarketplaces[0],
      metric,
      periodicity,
      currency: selectedCurrency,
      page,
      limit,
    }),
    [startDate, endDate, effectiveAccountId, selectedMarketplaces, metric, periodicity, selectedCurrency, page, limit]
  )

  const {
    data: trendsData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetProductTrendsQuery(filters, {
    skip: !startDate || !endDate || !effectiveAccountId,
  })

  const showLoading = isLoading || accountsLoading
  const showError = !showLoading && isError
  const hasData = trendsData && (
    Array.isArray(trendsData.products) ? trendsData.products.length > 0 : typeof trendsData === 'object' && Object.keys(trendsData).length > 0
  )
  const showEmpty = !showLoading && !showError && !hasData
  const showTable = !showLoading && !showError && hasData

  const currentPresetLabel = useMemo(() => {
    const preset = trendPresets.find((p) => p.id === selectedPreset)
    return preset?.label || 'Custom range'
  }, [selectedPreset])

  const month1 = calendarViewDate
  const month2 = addMonths(calendarViewDate, 1)

  return (
    <div className={cn('w-full', className)}>
      {/* Toolbar */}
      <div className="bg-surface-secondary border-b border-border mb-6">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-[55%]">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <Input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 flex-1 justify-end">
              <div className="relative" ref={presetRef}>
                <button
                  type="button"
                  onClick={() => setIsPresetOpen((v) => !v)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors min-w-[200px]',
                    isPresetOpen
                      ? 'border-2 border-primary-100 text-primary-700'
                      : 'bg-surface border-border text-text-primary hover:bg-surface-tertiary'
                  )}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm truncate">{currentPresetLabel}</span>
                  <svg className={cn('w-4 h-4 ml-auto transition-transform', isPresetOpen ? 'rotate-180' : '')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isPresetOpen && dropdownMode === 'simple' && (
                  <div className="absolute right-0 mt-2 w-72 bg-surface border border-border rounded-lg shadow-lg z-50 py-1">
                    <div className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border">Period Presets</div>
                    {trendPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset.id)}
                        className={cn(
                          'w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between',
                          selectedPreset === preset.id ? 'bg-primary-700 text-white font-medium' : 'text-text-primary hover:bg-surface-secondary'
                        )}
                      >
                        <span>{preset.label}</span>
                        {selectedPreset === preset.id && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {isPresetOpen && dropdownMode === 'custom' && (
                  <div className="absolute right-0 mt-2 w-[640px] bg-surface border border-border rounded-lg shadow-lg z-50 overflow-hidden flex">
                    <div className="w-[38%] border-r border-border p-2">
                      <div className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider">Presets</div>
                      {trendPresets.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyPreset(preset.id)}
                          className={cn(
                            'w-full text-left px-3 py-2.5 text-sm rounded transition-colors flex items-center justify-between',
                            selectedPreset === preset.id ? 'bg-primary-700 text-white font-medium' : 'text-text-primary hover:bg-surface-secondary'
                          )}
                        >
                          <span>{preset.label}</span>
                          {selectedPreset === preset.id && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="w-[62%] p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-sm text-text-muted">Periodicity</span>
                        <div className="flex bg-surface-secondary rounded-lg p-1">
                          {(['day', 'week', 'month'] as Periodicity[]).map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setTempPeriodicity(p)}
                              className={cn(
                                'px-3 py-1 text-sm rounded transition-colors capitalize',
                                tempPeriodicity === p ? 'bg-primary-700 text-white shadow-sm' : 'text-text-muted hover:text-text-primary'
                              )}
                            >
                              By {p}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <button type="button" onClick={() => setCalendarViewDate((d) => addMonths(d, -1))} className="p-1 hover:bg-surface-secondary rounded text-text-muted hover:text-text-primary">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <div className="flex gap-8 text-sm font-medium text-text-primary">
                          <span>{format(month1, 'MMM yyyy')}</span>
                          <span>{format(month2, 'MMM yyyy')}</span>
                        </div>
                        <button type="button" onClick={() => setCalendarViewDate((d) => addMonths(d, 1))} className="p-1 hover:bg-surface-secondary rounded text-text-muted hover:text-text-primary">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex gap-4">
                        <CalendarGrid year={getYear(month1)} month={getMonth(month1)} selectedStart={tempStartDate} selectedEnd={tempEndDate} hoverDate={hoverDate} onDateClick={handleDateClick} onHover={setHoverDate} />
                        <CalendarGrid year={getYear(month2)} month={getMonth(month2)} selectedStart={tempStartDate} selectedEnd={tempEndDate} hoverDate={hoverDate} onDateClick={handleDateClick} onHover={setHoverDate} />
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                        <div className="text-sm text-text-secondary">
                          {tempStartDate && tempEndDate
                            ? `${format(parseISO(tempStartDate), 'MMM d, yyyy')} - ${format(parseISO(tempEndDate), 'MMM d, yyyy')}`
                            : tempStartDate ? `${format(parseISO(tempStartDate), 'MMM d, yyyy')} - Select end date` : 'Select a date range'}
                        </div>
                        <Button variant="primary" onClick={applyCustomRange} disabled={!tempStartDate || !tempEndDate} className="bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50">Apply</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="min-w-[160px]">
                <MarketplaceMultiSelect options={MARKETPLACES} value={selectedMarketplaces} onChange={setSelectedMarketplaces} />
              </div>

              <div className="min-w-[100px]">
                <select value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)} className="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-600">
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>

              <Button variant="ghost" onClick={() => refetch()} disabled={isLoading} className="bg-surface border border-border hover:bg-surface-tertiary text-text-primary" title="Reload data">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Tabs */}
      <div className="mb-4 pt-2 overflow-visible">
        <div className="flex items-center justify-between gap-4">
          <MetricTabs value={metric} onChange={(m) => { setMetric(m); setPage(1); }} />
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">Heatmap</span>
            <button onClick={() => setHeatmapEnabled(!heatmapEnabled)} className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2', heatmapEnabled ? 'bg-primary-600' : 'bg-surface-tertiary')}>
              <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white transition-transform', heatmapEnabled ? 'translate-x-6' : 'translate-x-1')} />
            </button>
            <span className={cn('text-sm', heatmapEnabled ? 'text-primary-600' : 'text-text-muted')}>{heatmapEnabled ? 'on' : 'off'}</span>
          </div>
        </div>
      </div>

      {/* Table — fixed min-height so it never collapses */}
      <Card>
        <CardContent className="p-0 min-h-[600px] flex flex-col">
          {showError && (
            <div className="flex-1 flex items-center justify-center p-6">
              <ErrorComponent error={error} onRetry={() => refetch()} title="Failed to load trends data" />
            </div>
          )}

          {showEmpty && !isFetching && (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-text-secondary">
                <svg className="w-12 h-12 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">No trends data available for the selected filters.</p>
                <Button variant="secondary" onClick={() => refetch()} size="sm">Retry</Button>
              </div>
            </div>
          )}

          {(showTable || isFetching) && (
            <div className="flex-1 p-6">
              <TrendsTable
                data={trendsData as any}
                isLoading={isLoading}
                isFetching={isFetching}
                error={isError ? error : undefined}
                currency={selectedCurrency}
                searchTerm={searchTerm}
                heatmapEnabled={heatmapEnabled}
                page={page}
                onPageChange={setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}