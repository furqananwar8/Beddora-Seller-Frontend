import { baseApi } from './baseApi'

/** SKU Mapper: channel listings bound to internal SKUs (Procurement products) with a quantity per unit sold. */

export interface SkuMappingOption {
  id: string
  name: string
}

export interface SkuMappingChannel extends SkuMappingOption {
  marketplaces: SkuMappingOption[]
  fulfillments: SkuMappingOption[]
  referenceLabel: string
}

export type MappingStatus = 'mapped' | 'unmapped' | 'new'

export interface BindingComponent {
  productId: number
  sku: string
  name: string
  quantity: number
  /** Warehouse units; null when the SKU has no inventory item. */
  onHand?: number | null
}

export interface ChannelSku {
  /** `marketplace:sku`, unique within the channel. */
  key: string
  sku: string
  marketplace: string
  fulfillment: string | null
  productName: string | null
  reference: string | null
  status: MappingStatus
  version: number | null
  components: BindingComponent[]
}

export interface ChannelSkuSummary {
  total: number
  mapped: number
  /** Unmapped including New. */
  unmapped: number
  new: number
}

export interface ChannelSkuPage {
  data: ChannelSku[]
  totalRecords: number
  page: number
  limit: number
  totalPages: number
  summary: ChannelSkuSummary
}

export interface ChannelSkuParams {
  channel: string
  marketplaces: string[]
  fulfillments: string[]
  search?: string
  /** Empty or missing = every status. */
  statuses?: MappingStatus[]
  /** Only these listing keys. */
  keys?: string[]
  page: number
  limit: number
}

export interface InternalSku {
  productId: number
  sku: string
  name: string
  onHand: number | null
}

export type TimelineAction = 'bound' | 'unbound' | 'quantity'

export interface TimelineEvent {
  at: string
  action: TimelineAction
  key: string
  channelSku: string
  marketplace: string
  internalSku: string
  from: number | null
  to: number | null
  by: string
  version: number
}

export interface BindingVersion {
  version: number
  effectiveFrom: string
  effectiveTo: string | null
  reason: string | null
  by: string
  components: BindingComponent[]
}

export interface BindingChange {
  marketplace: string
  channelSku: string
  components: Array<{ productId: number; quantity: number }>
  reason?: string
}

const csv = (ids: string[] | undefined) => (ids && ids.length > 0 ? ids.join(',') : undefined)

export const skuMappingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSkuMappingOptions: builder.query<SkuMappingChannel[], void>({
      query: () => '/inventory/sku-mapping/options',
      transformResponse: (response: { data: SkuMappingChannel[] }) => response.data,
    }),

    getChannelSkus: builder.query<ChannelSkuPage, ChannelSkuParams>({
      query: ({ channel, marketplaces, fulfillments, search, statuses, keys, page, limit }) => ({
        url: '/inventory/sku-mapping/channel-skus',
        params: { channel, marketplaces: csv(marketplaces), fulfillments: csv(fulfillments), keys: csv(keys), statuses: csv(statuses), search: search || undefined, page, limit },
      }),
      providesTags: ['SkuMapping'],
    }),

    getInternalSkus: builder.query<InternalSku[], string>({
      query: (search) => ({ url: '/inventory/sku-mapping/internal-skus', params: { search: search || undefined } }),
      transformResponse: (response: { data: InternalSku[] }) => response.data,
    }),

    getSkuTimeline: builder.query<TimelineEvent[], { channel: string; keys?: string[] }>({
      query: ({ channel, keys }) => ({ url: '/inventory/sku-mapping/timeline', params: { channel, keys: csv(keys) } }),
      transformResponse: (response: { data: TimelineEvent[] }) => response.data,
      providesTags: ['SkuMapping'],
    }),

    getBindingHistory: builder.query<BindingVersion[], { channel: string; marketplace: string; sku: string }>({
      query: (params) => ({ url: '/inventory/sku-mapping/history', params }),
      transformResponse: (response: { data: BindingVersion[] }) => response.data,
      providesTags: ['SkuMapping'],
    }),

    saveBindings: builder.mutation<{ saved: number }, { channel: string; changes: BindingChange[] }>({
      query: (body) => ({ url: '/inventory/sku-mapping/bindings', method: 'PUT', body }),
      transformResponse: (response: { data: { saved: number } }) => response.data,
      invalidatesTags: ['SkuMapping'],
    }),
  }),
})

export const {
  useGetSkuMappingOptionsQuery,
  useGetChannelSkusQuery,
  useLazyGetChannelSkusQuery,
  useGetInternalSkusQuery,
  useGetSkuTimelineQuery,
  useGetBindingHistoryQuery,
  useSaveBindingsMutation,
} = skuMappingApi
