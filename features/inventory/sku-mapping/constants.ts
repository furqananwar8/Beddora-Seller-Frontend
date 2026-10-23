import type { StatusTone } from '@/components/status-badge/StatusBadge'
import type { MappingStatus } from '@/services/api/skuMapping.api'

/** Most channel SKUs the graph holds at once. */
export const GRAPH_LIMIT = 30
/** Above this many channel SKUs the graph switches to compact rows. */
export const COMPACT_FROM = 9
/** SKUs loaded on the graph when a filter is applied to an empty graph. */
export const INITIAL_LOAD = 8

export const SKU_MAPPING_ROUTES = {
  mapper: '/dashboard/inventory/sku-mapping',
  history: (channel: string, marketplace: string, sku: string) =>
    `/dashboard/inventory/sku-mapping/history?${new URLSearchParams({ channel, marketplace, sku }).toString()}`,
}

/** Status shown on a channel SKU; `edited` is local only (unsaved changes). */
export type NodeStatus = MappingStatus | 'edited'

export const STATUS_META: Record<NodeStatus, { label: string; tone: StatusTone }> = {
  new: { label: 'New', tone: 'info' },
  unmapped: { label: 'Unmapped', tone: 'danger' },
  mapped: { label: 'Mapped', tone: 'success' },
  edited: { label: 'Edited', tone: 'warning' },
}

export const MARKETPLACE_NAMES: Record<string, string> = { CA: 'Canada', US: 'USA', MX: 'Mexico' }
export const marketplaceName = (code: string) => MARKETPLACE_NAMES[code] ?? code
