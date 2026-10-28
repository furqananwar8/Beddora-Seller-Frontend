import { format } from 'date-fns'

export const todayDay = () => format(new Date(), 'yyyy-MM-dd')

export interface SkuLandedFilters extends Record<string, unknown> {
  search: string
  /** YYYY-MM-DD: costs as they stood at the end of that day. */
  asOf: string
}

export const defaultSkuLandedFilters = (): SkuLandedFilters => ({ search: '', asOf: todayDay() })
