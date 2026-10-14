import {
  useGetChannelConnectionsQuery,
  useGetChannelListingsQuery,
  useGetChannelReportSummaryQuery,
} from '@/services/api/channelReport.api'

/**
 * Data hooks of the Channel Report. The screen only uses these, so where the data comes from stays in one place.
 */

export const useChannelConnections = () => useGetChannelConnectionsQuery()

export const useChannelReportSummary = useGetChannelReportSummaryQuery

export const useChannelListings = useGetChannelListingsQuery
