'use client'

import React from 'react'
import { Button } from '@/design-system/buttons'
import { Select, Input } from '@/design-system/inputs'
import { MultiSelectInput } from '@/components/multi-select-input/MultiSelectInput'
import DateRangePicker, {
  DateRangeValue,
} from '@/components/date-range-picker/DateRangePicker'
import { MARKETPLACES } from '@/utils/marketplaces'

interface ProfitDashboardHeaderProps {
  searchTerm?: string
  onSearchChange?: (
    value: string
  ) => void

  dateRange?: DateRangeValue
  datePresets?: any[]
  keepOpenPresetIds?: string[]
  onDateRangeChange?: (
    range: DateRangeValue
  ) => void

  datePickerKey?: number

  dateDisplayFormat?: string
  datePlaceholder?: string

  marketplaces?: string[]
  onMarketplacesChange?: (
    value: string[]
  ) => void

  currency?: string
  onCurrencyChange?: (
    value: string
  ) => void

  currencyOptions?: {
    value: string
    label: string
  }[]

  onFilter?: () => void
  isFiltering?: boolean

  searchWidth?: string
  datePickerWidth?: string
  marketplaceWidth?: string
  currencyWidth?: string

  showSearch?: boolean
  showDateRange?: boolean
  showMarketplace?: boolean
  showCurrency?: boolean
  showFilterButton?: boolean

  disabled?: boolean

  /** Extra controls rendered between the date range and the marketplace dropdown. */
  extraFilters?: React.ReactNode
  /** Draft filters differ from the applied ones: Apply Filters gets primary styling. */
  filterPending?: boolean
  /** Note rendered under the filter row (e.g. "press Apply Filters"). */
  note?: React.ReactNode
  /** Let the filter row wrap onto several lines on narrow screens. */
  wrap?: boolean
  searchPlaceholder?: string
  /** Render currency with the same dropdown as the marketplace filter instead of a native select. */
  currencyAsDropdown?: boolean
  /** Padding around the filter row. */
  paddingClassName?: string
}

export const ProfitDashboardHeader: React.FC<
  ProfitDashboardHeaderProps
> = ({
  searchTerm = '',
  onSearchChange,

  dateRange,
  datePresets = [],
  keepOpenPresetIds = [],
  onDateRangeChange,

  datePickerKey = 0,

  dateDisplayFormat = 'MMM d, yyyy',
  datePlaceholder = 'Select date range',

  marketplaces = [],
  onMarketplacesChange,

  currency = '',
  onCurrencyChange,

  currencyOptions = [
    {
      value: 'CAD',
      label: 'CAD',
    },
    {
      value: 'USD',
      label: 'USD',
    },
    {
      value: 'EUR',
      label: 'EUR',
    },
  ],

  onFilter,
  isFiltering = false,

  searchWidth = 'w-[55%]',
  datePickerWidth = 'shrink-0',
  marketplaceWidth = 'min-w-[160px] shrink-0',
  currencyWidth = 'min-w-[100px] shrink-0',

  showSearch = true,
  showDateRange = true,
  showMarketplace = true,
  showCurrency = true,
  showFilterButton = true,

  disabled = false,

  extraFilters,
  filterPending = false,
  note,
  wrap = false,
  searchPlaceholder = 'Search',
  currencyAsDropdown = false,
  paddingClassName = 'px-6 py-4',
}) => {
  return (
    <div className="bg-surface-secondary border-b border-border mb-6">
      <div className={paddingClassName}>

        <div
          className={`flex items-center w-full ${
            wrap ? 'flex-wrap gap-y-3' : ''
          }`}
        >

          {/* SEARCH */}
          {showSearch && (
            <div
              className={`
                ${searchWidth}
                min-w-0
                shrink
              `}
            >
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
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  disabled={disabled}
                  onChange={(e) =>
                    onSearchChange?.(
                      e.target.value
                    )
                  }
                  className="
                    w-full
                    pl-10
                    pr-4
                    py-2.5
                    bg-surface
                    border
                    border-border
                    rounded-lg
                    text-text-primary
                    placeholder:text-text-muted
                    focus:outline-none
                    focus:ring-2
                    focus:ring-primary-200
                    focus:border-primary-600
                  "
                />
              </div>
            </div>
          )}

          {/* GAP BETWEEN SEARCH AND FILTERS */}
          {showSearch &&
            !wrap &&
            (showDateRange ||
              showMarketplace ||
              showCurrency ||
              showFilterButton) && (
              <div className="w-6 shrink-0" />
            )}

          {/* RIGHT SIDE CONTROLS */}
          <div
            className={`flex items-center gap-3 ${
              wrap ? 'flex-wrap' : 'shrink-0'
            }`}
          >

            {/* DATE RANGE */}
            {showDateRange &&
              dateRange &&
              onDateRangeChange && (
                <div
                  className={`${datePickerWidth} min-w-0`}
                >
                  <DateRangePicker
                    key={datePickerKey}
                    value={dateRange}
                    presets={datePresets}
                    keepOpenPresetIds={
                      keepOpenPresetIds
                    }
                    onChange={
                      onDateRangeChange
                    }
                    displayFormat={
                      dateDisplayFormat
                    }
                    placeholder={
                      datePlaceholder
                    }
                  />
                </div>
              )}

            {/* EXTRA FILTERS (optional) */}
            {extraFilters}

            {/* MARKETPLACE */}
            {showMarketplace &&
              onMarketplacesChange && (
                <div
                  className={`${marketplaceWidth} shrink-0`}
                >
                  <MultiSelectInput
                    title="Marketplace"
                    options={MARKETPLACES}
                    value={marketplaces}
                    onChange={
                      onMarketplacesChange
                    }
                  />
                </div>
              )}

            {/* CURRENCY */}
            {showCurrency &&
              onCurrencyChange && (
                <div
                  className={`${currencyWidth} shrink-0`}
                >
                  {currencyAsDropdown ? (
                    <MultiSelectInput
                      single
                      title="Currency"
                      options={currencyOptions.map(
                        ({ value, label }) => ({
                          id: value,
                          name: label,
                        })
                      )}
                      value={[currency]}
                      onChange={(value) =>
                        onCurrencyChange(
                          value[0]
                        )
                      }
                    />
                  ) : (
                    <Select
                      value={currency}
                      disabled={disabled}
                      onChange={(e) =>
                        onCurrencyChange(
                          e.target.value
                        )
                      }
                      options={
                        currencyOptions
                      }
                    />
                  )}
                </div>
              )}

            {/* FILTER */}
            {showFilterButton && (
              <Button
                variant={
                  filterPending
                    ? 'primary'
                    : 'ghost'
                }
                onClick={onFilter}
                disabled={
                  disabled ||
                  isFiltering
                }
                className={`
                  min-w-[140px]
                  shrink-0
                  whitespace-nowrap
                  flex
                  items-center
                  justify-center
                  gap-2
                  ${
                    filterPending
                      ? ''
                      : 'bg-surface border border-border hover:bg-surface-tertiary text-text-primary'
                  }
                `}
                title="Apply filters"
              >
                <svg
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4h18M6 10h12M10 16h4M11 22h2"
                  />
                </svg>

                <span className="whitespace-nowrap">
                  Apply Filters
                </span>
              </Button>
            )}

          </div>
        </div>

        {note && <div className="mt-3">{note}</div>}
      </div>
    </div>
  )
}

export default ProfitDashboardHeader