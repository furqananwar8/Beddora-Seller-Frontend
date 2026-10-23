import type { ChannelSkuParams } from '@/services/api/skuMapping.api'

export type SkuMappingFilterValues = {
  channel: string
  /** Empty = every marketplace of the channel. */
  marketplaces: string[]
  /** Empty = every fulfillment option of the channel. */
  fulfillments: string[]
  search: string
}

export const DEFAULT_SKU_MAPPING_FILTERS: SkuMappingFilterValues = { channel: 'amazon', marketplaces: [], fulfillments: [], search: '' }

/** The listing query every SKU Mapper request shares: what the filter bar has applied. */
export type ListingScope = Pick<ChannelSkuParams, 'channel' | 'marketplaces' | 'fulfillments' | 'search'>

export const scopeOf = ({ channel, marketplaces, fulfillments, search }: SkuMappingFilterValues): ListingScope => ({
  channel,
  marketplaces,
  fulfillments,
  search: search.trim() || undefined,
})
