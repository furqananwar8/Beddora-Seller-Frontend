import type { ChannelId } from '../channelReport.types'

/** One Live Report tab per channel; each has its own permission, `profit.channel-report.<id>` (Settings > Users > Feature access). */
export const LIVE_REPORT_TABS: Array<{ id: ChannelId; label: string }> = [
  { id: 'amazon', label: 'Amazon' },
  { id: 'walmart', label: 'Walmart' },
  { id: 'shopify', label: 'Shopify' },
  { id: 'temu', label: 'Temu' },
  { id: 'tiktok', label: 'TikTok Shop' },
]

export const liveReportSubject = (channel: ChannelId) => `profit:channel-report.${channel}`
