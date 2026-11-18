import { earliestAsOf, todayDay } from '../warehouse-inventory/warehouseInventoryFilters'

export { earliestAsOf, todayDay }

export interface StockCountFilters extends Record<string, unknown> {
  search: string
  asOf: string
}

export const defaultFilters = (): StockCountFilters => ({ search: '', asOf: todayDay() })
