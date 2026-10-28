import type { SegmentedOption } from '@/components/segmented-toggle/SegmentedToggle'
import type { AgeFilter, AgingMarketplace } from '@/services/api/inventoryAging.api'

export const MARKETPLACE_OPTIONS: Array<SegmentedOption<AgingMarketplace>> = [
  { value: 'CA', label: 'Canada' },
  { value: 'US', label: 'USA' },
  { value: 'MX', label: 'Mexico' },
]

export const AGE_OPTIONS: Array<SegmentedOption<AgeFilter>> = [
  { value: 'all', label: 'All' },
  { value: 'over-180', label: 'Over 180 days' },
  { value: 'over-365', label: 'Over 365 days' },
]

export interface InventoryAgingFilters extends Record<string, unknown> {
  search: string
  marketplace: AgingMarketplace
  age: AgeFilter
}

export const defaultFilters = (): InventoryAgingFilters => ({ search: '', marketplace: 'CA', age: 'all' })
