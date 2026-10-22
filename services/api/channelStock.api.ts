import { baseApi } from './baseApi'

/** Channel Inventory (IP): the stock each sales channel reports, one row shape for every channel. */

export interface ChannelStockOption {
  id: string
  name: string
}

export interface ChannelStockChannel extends ChannelStockOption {
  marketplaces: ChannelStockOption[]
  fulfillments: ChannelStockOption[]
  /** What a row's `reference` is, e.g. `ASIN`. */
  referenceLabel: string
}

export interface ChannelStockRow {
  id: string
  sku: string
  productName: string | null
  /** ASIN (Amazon) or ship node (Walmart). */
  reference: string | null
  marketplace: string
  fulfillment: string
  available: number
  /** Null when the channel doesn't report the figure. */
  reserved: number | null
  inbound: number | null
  unsellable: number | null
  onHand: number | null
  syncedAt: string | null
}

export interface ChannelStockSummary {
  skus: number
  available: number
  inbound: number | null
  outOfStock: number
}

export interface ChannelStockParams {
  channel: string
  marketplaces: string[]
  fulfillments: string[]
  search?: string
  page: number
  limit: number
}

export interface ChannelStockPage {
  success: boolean
  data: ChannelStockRow[]
  totalRecords: number
  page: number
  limit: number
  totalPages: number
  summary: ChannelStockSummary
  syncedAt: string | null
}

const csv = (ids: string[]) => (ids.length > 0 ? ids.join(',') : undefined)

export const channelStockApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getChannelStockOptions: builder.query<ChannelStockChannel[], void>({
      query: () => '/inventory/channel-stock/options',
      transformResponse: (response: { data: ChannelStockChannel[] }) => response.data,
    }),

    getChannelStock: builder.query<ChannelStockPage, ChannelStockParams>({
      query: ({ channel, marketplaces, fulfillments, search, page, limit }) => ({
        url: '/inventory/channel-stock',
        params: { channel, marketplaces: csv(marketplaces), fulfillments: csv(fulfillments), search: search || undefined, page, limit },
      }),
    }),
  }),
})

export const { useGetChannelStockOptionsQuery, useGetChannelStockQuery } = channelStockApi
