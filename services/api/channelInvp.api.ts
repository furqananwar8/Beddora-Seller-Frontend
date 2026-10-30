import { baseApi } from './baseApi'
import { Page } from './finance.api'
import { csv } from './queryParams'

export type InvpChannel = 'amazon' | 'shopify' | 'walmart' | 'temu'
export type InvpChannelFilter = 'all' | InvpChannel
export type InvpMarketplace = 'CA' | 'US' | 'MX'
/** How long the stock lasts against the 30-day clearance target. */
export type CoverLevel = 'FINISHED' | 'NEAR_END' | 'HEALTHY' | 'HIGH' | 'EXCESS'

export interface InvpProjectionCell {
  date: string
  totalInventory: number
  /** Container units that started their journey in the column (today: everything on its way now). */
  inTransit: number
  /** null when nothing sells. */
  daysOfCover: number | null
  level: CoverLevel
}

export interface InvpRow {
  product: { id: number; sku: string; name: string }
  asins: string[]
  stock: { warehouse: number; platform: number; shipping: number }
  sales: { daily: number; potential: number; projected: number }
  projection: InvpProjectionCell[]
}

export interface InvpReport extends Page<InvpRow> {
  asOf: string
  weeks: string[]
  thresholds: { nearEnd: number; healthy: number; target: number }
}

export interface InvpParams {
  channel: InvpChannelFilter
  marketplaces?: InvpMarketplace[]
  search?: string
  page: number
  limit: number
}

const params = ({ marketplaces, search, ...rest }: InvpParams) => ({ ...rest, marketplaces: csv(marketplaces), search: search || undefined })

export const channelInvpApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getChannelInvp: builder.query<InvpReport, InvpParams>({
      query: (query) => ({ url: '/inventory/channel-invp', params: params(query) }),
      providesTags: ['Inventory'],
    }),
  }),
})

export const { useGetChannelInvpQuery } = channelInvpApi
