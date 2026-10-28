import { baseApi } from './baseApi'
import { Envelope, Page, unwrap } from './finance.api'
import { csv } from './queryParams'

export type InvpChannel = 'amazon' | 'shopify' | 'walmart' | 'temu'
export type InvpMarketplace = 'CA' | 'US' | 'MX'
export type InvpGrouping = 'day' | 'week' | 'month'
export type InvpView = 'count' | 'amount'
export type InvpLine = 'warehouse' | 'container' | 'channel'
/** Days of cover: LOW (little left), MID, HIGH (more than sells). */
export type StockLevel = 'LOW' | 'MID' | 'HIGH'

export interface InvpPeriod {
  key: string
  label: string
  start: string
  end: string
}

export interface InvpCell {
  /** Units, or their landed cost in the view by amount. */
  value: number
  units: number
  level: StockLevel | null
}

export interface InvpMarketplaceRow {
  marketplace: InvpMarketplace
  channelSkus: Array<{ sku: string; units: number }>
  dailySales: number
  unitCost: number
  currency: 'CAD' | 'USD'
  lines: Record<InvpLine, Record<string, InvpCell>>
}

export interface InvpRow {
  product: { id: number; sku: string; name: string }
  marketplaces: InvpMarketplaceRow[]
}

export interface InvpReport extends Page<InvpRow> {
  periods: InvpPeriod[]
  view: InvpView
  thresholds: { low: number; high: number }
}

export interface InvpParams {
  channel: InvpChannel
  marketplaces?: InvpMarketplace[]
  from: string
  to: string
  groupBy: InvpGrouping
  view: InvpView
  search?: string
  page: number
  limit: number
}

/** One thing behind a figure: a ledger day, a stock movement, a container. */
export interface InvpEntry {
  period: string
  date: string
  label: string
  quantity: number
  detail: string | null
}

export type InvpBreakdownParams = InvpParams & { productId: number; marketplace: InvpMarketplace; line: InvpLine; period: string }

const params = ({ marketplaces, search, ...rest }: InvpParams) => ({ ...rest, marketplaces: csv(marketplaces), search: search || undefined })

export const channelInvpApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getChannelInvp: builder.query<InvpReport, InvpParams>({
      query: (query) => ({ url: '/inventory/channel-invp', params: params(query) }),
      providesTags: ['Inventory'],
    }),
    getChannelInvpBreakdown: builder.query<{ entries: InvpEntry[] }, InvpBreakdownParams>({
      query: ({ productId, marketplace, line, period, ...query }) => ({ url: '/inventory/channel-invp/breakdown', params: { ...params(query), productId, marketplace, line, period } }),
      transformResponse: (response: Envelope<{ entries: InvpEntry[] }>) => unwrap(response),
      providesTags: ['Inventory'],
    }),
  }),
})

export const { useGetChannelInvpQuery, useGetChannelInvpBreakdownQuery } = channelInvpApi
