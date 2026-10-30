import { subDays } from 'date-fns'
import type { FilterOption } from '@/components/filter-bar/FilterMultiSelect'
import type { SegmentedOption } from '@/components/segmented-toggle/SegmentedToggle'
import { STATUS_TONE } from '@/utils/statusTones'
import type { CoverLevel, InvpChannel, InvpChannelFilter, InvpMarketplace, InvpReport } from '@/services/api/channelInvp.api'

/** How far back the inventory screens reach: about three months. */
export const MAX_LOOKBACK_DAYS = 92

/** The earliest day a picker offers. */
export const earliestDay = () => subDays(new Date(), MAX_LOOKBACK_DAYS)

export const CHANNEL_LABEL: Record<InvpChannel, string> = { amazon: 'Amazon', shopify: 'Shopify', walmart: 'Walmart', temu: 'Temu' }

export const CHANNEL_OPTIONS: Array<SegmentedOption<InvpChannelFilter>> = [
  { value: 'all', label: 'All' },
  ...(Object.keys(CHANNEL_LABEL) as InvpChannel[]).map((value) => ({ value, label: CHANNEL_LABEL[value] })),
]

export const MARKETPLACE_META: Record<InvpMarketplace, { label: string }> = {
  CA: { label: 'Canada' },
  US: { label: 'USA' },
  MX: { label: 'Mexico' },
}

export const MARKETPLACE_OPTIONS: Array<FilterOption<InvpMarketplace>> = (Object.keys(MARKETPLACE_META) as InvpMarketplace[]).map((code) => ({
  value: code,
  label: MARKETPLACE_META[code].label,
}))

type Thresholds = InvpReport['thresholds']

/** Each stock level's colour and legend; `rule` reads the server's thresholds so the legend never drifts from them. */
export const LEVEL_META: Record<CoverLevel, { label: string; rule: (t: Thresholds) => string; cell: string; swatch: string }> = {
  FINISHED: { label: 'Stock finished', rule: () => 'No stock left', ...STATUS_TONE.white },
  NEAR_END: { label: 'Stock near end', rule: (t) => `Up to ${t.nearEnd} days`, ...STATUS_TONE.purple },
  HEALTHY: { label: 'Clears on target', rule: (t) => `${t.nearEnd + 1}–${t.healthy} days`, ...STATUS_TONE.green },
  HIGH: { label: 'Stock high, sales moderate', rule: (t) => `${t.healthy + 1}–${t.target} days`, ...STATUS_TONE.pink },
  EXCESS: { label: 'Stock high, sales low', rule: (t) => `Over ${t.target} days, or not selling`, ...STATUS_TONE.red },
}

export const LEVELS: CoverLevel[] = ['FINISHED', 'NEAR_END', 'HEALTHY', 'HIGH', 'EXCESS']

export interface InvpFilters extends Record<string, unknown> {
  channel: InvpChannelFilter
  search: string
  marketplaces: InvpMarketplace[]
}

export const defaultFilters = (): InvpFilters => ({ channel: 'all', search: '', marketplaces: [] })
