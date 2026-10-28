import type { DateRangeValue } from '@/components/date-range-picker/DateRangePicker'
import type { PartnerAgingParams } from '@/services/api/finance.api'

export interface AgingFilters extends Record<string, unknown> {
  /** Invoice dates; empty is any date. */
  range: DateRangeValue
  currencies: string[]
}

export const defaultAgingFilters = (): AgingFilters => ({
  range: { startDate: null, endDate: null, presetId: null },
  currencies: [],
})

/** The applied filters as the report endpoint takes them; empty filters are left out. */
export const agingParams = ({ range, currencies }: AgingFilters): PartnerAgingParams => ({
  from: range.startDate ?? undefined,
  to: range.endDate ?? undefined,
  currencies,
})
