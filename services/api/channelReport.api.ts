import { baseApi } from './baseApi'
import type {
  ChannelConnection,
  ChannelListingsResult,
  ChannelPeriodSummary,
  ChannelReportParams,
} from '@/features/profit/channel-report/channelReport.types'

/**
 * Channel Report endpoints (backend: /profit/channel-report). Every response uses the `{ success, data }`
 * envelope; list params go as comma-separated strings.
 */

interface Envelope<T> {
  success: boolean
  data: T
}

const toQuery = ({ channels, marketplaces, currency, basis, periods, startDate, endDate }: ChannelReportParams) => ({
  channels: channels.join(','),
  marketplaces: marketplaces.join(','),
  currency,
  basis,
  ...(periods?.length ? { periods: periods.join(',') } : {}),
  ...(startDate ? { startDate } : {}),
  ...(endDate ? { endDate } : {}),
})

export const channelReportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getChannelConnections: builder.query<ChannelConnection[], void>({
      query: () => '/profit/channel-report/connections',
      transformResponse: (response: Envelope<ChannelConnection[]>) => response.data,
      keepUnusedDataFor: 300,
    }),

    getChannelReportSummary: builder.query<ChannelPeriodSummary[], ChannelReportParams>({
      query: (params) => ({ url: '/profit/channel-report/summary', params: toQuery(params) }),
      transformResponse: (response: Envelope<ChannelPeriodSummary[]>) => response.data,
      providesTags: ['Profit'],
      keepUnusedDataFor: 180,
    }),

    getChannelListings: builder.query<ChannelListingsResult, ChannelReportParams>({
      query: (params) => ({ url: '/profit/channel-report/listings', params: toQuery(params) }),
      transformResponse: (response: Envelope<ChannelListingsResult>) => response.data,
      providesTags: ['Profit'],
      keepUnusedDataFor: 180,
    }),
  }),
})

export const { useGetChannelConnectionsQuery, useGetChannelReportSummaryQuery, useGetChannelListingsQuery } =
  channelReportApi
