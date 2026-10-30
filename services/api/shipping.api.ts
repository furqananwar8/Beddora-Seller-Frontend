import type {
  BookShipmentBody,
  ChannelInfo,
  ChannelOrderDetail,
  ChannelOrderListItem,
  ChannelOrderListParams,
  ChannelOrderRef,
  ParcelShipmentDto,
  ParcelShipmentListItem,
  ShipmentListParams,
  ShipmentSummary,
  ShippingConfig,
  ShippingProduct,
} from '@/features/shipping/types'
import { baseApi } from './baseApi'
import { Envelope, Page, unwrap } from './finance.api'
import { csv } from './queryParams'

/**
 * Parcel shipping over Stallion, Shippo and UniUni. The rate stream (SSE) and document downloads are plain
 * `fetch` calls: see `features/shipping/useRateStream.ts` and `features/shipping/print/usePrintDocument.ts`.
 */
export const shippingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getShippingConfig: builder.query<ShippingConfig, void>({
      query: () => '/shipping/config',
      transformResponse: (response: Envelope<ShippingConfig>) => unwrap(response),
      providesTags: ['ShippingConfig'],
      keepUnusedDataFor: 600,
    }),
    searchShippingProducts: builder.query<ShippingProduct[], { search: string; limit?: number }>({
      query: ({ search, limit = 20 }) => ({ url: '/shipping/products', params: { search: search || undefined, limit } }),
      transformResponse: (response: Envelope<ShippingProduct[]>) => unwrap(response),
    }),
    getShipments: builder.query<Page<ParcelShipmentListItem>, ShipmentListParams>({
      query: ({ search, providers, statuses, ...params }) => ({
        url: '/shipping/shipments',
        params: { ...params, search: search || undefined, providers: csv(providers), statuses: csv(statuses) },
      }),
      providesTags: ['ShippingShipments'],
    }),
    getShipmentSummary: builder.query<ShipmentSummary, void>({
      query: () => '/shipping/shipments/summary',
      transformResponse: (response: Envelope<ShipmentSummary>) => unwrap(response),
      providesTags: ['ShippingShipments'],
    }),
    getShipment: builder.query<ParcelShipmentDto, number>({
      query: (id) => `/shipping/shipments/${id}`,
      transformResponse: (response: Envelope<ParcelShipmentDto>) => unwrap(response),
      providesTags: (_result, _error, id) => [{ type: 'ShippingShipments', id }],
    }),
    /** `idempotencyKey` is made once per Book click and resent on a retry, so a replay returns the same shipment. */
    bookShipment: builder.mutation<ParcelShipmentDto, { body: BookShipmentBody; idempotencyKey: string }>({
      query: ({ body, idempotencyKey }) => ({ url: '/shipping/shipments', method: 'POST', body, headers: { 'Idempotency-Key': idempotencyKey } }),
      transformResponse: (response: Envelope<ParcelShipmentDto>) => unwrap(response),
      invalidatesTags: ['ShippingShipments', 'ShippingChannelOrders'],
    }),
    cancelShipment: builder.mutation<ParcelShipmentDto, number>({
      query: (id) => ({ url: `/shipping/shipments/${id}/cancel`, method: 'POST' }),
      transformResponse: (response: Envelope<ParcelShipmentDto>) => unwrap(response),
      invalidatesTags: ['ShippingShipments'],
    }),
    refreshTracking: builder.mutation<ParcelShipmentDto, number>({
      query: (id) => ({ url: `/shipping/shipments/${id}/tracking/refresh`, method: 'POST' }),
      transformResponse: (response: Envelope<ParcelShipmentDto>) => unwrap(response),
      invalidatesTags: ['ShippingShipments'],
    }),
    /** Retries marking the shipment's channel order shipped. */
    retryChannelSync: builder.mutation<ParcelShipmentDto, number>({
      query: (id) => ({ url: `/shipping/shipments/${id}/channel-sync`, method: 'POST' }),
      transformResponse: (response: Envelope<ParcelShipmentDto>) => unwrap(response),
      invalidatesTags: ['ShippingShipments', 'ShippingChannelOrders'],
    }),
    getOrderChannels: builder.query<ChannelInfo[], void>({
      query: () => '/shipping/channel-orders/channels',
      transformResponse: (response: Envelope<ChannelInfo[]>) => unwrap(response),
      keepUnusedDataFor: 600,
    }),
    getChannelOrders: builder.query<Page<ChannelOrderListItem>, ChannelOrderListParams>({
      query: ({ search, channels, states, ...params }) => ({
        url: '/shipping/channel-orders',
        params: { ...params, search: search || undefined, channels: csv(channels), states: csv(states) },
      }),
      providesTags: ['ShippingChannelOrders'],
    }),
    getChannelOrder: builder.query<ChannelOrderDetail, ChannelOrderRef>({
      query: ({ channel, market, orderId }) => `/shipping/channel-orders/${channel}/${encodeURIComponent(market)}/${encodeURIComponent(orderId)}`,
      transformResponse: (response: Envelope<ChannelOrderDetail>) => unwrap(response),
      providesTags: ['ShippingChannelOrders'],
    }),
  }),
})

export const {
  useGetShippingConfigQuery,
  useSearchShippingProductsQuery,
  useGetShipmentsQuery,
  useGetShipmentSummaryQuery,
  useGetShipmentQuery,
  useBookShipmentMutation,
  useCancelShipmentMutation,
  useRefreshTrackingMutation,
  useRetryChannelSyncMutation,
  useGetOrderChannelsQuery,
  useGetChannelOrdersQuery,
  useGetChannelOrderQuery,
} = shippingApi
