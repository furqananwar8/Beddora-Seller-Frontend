import type {
  BucketId,
  ChannelBucket,
  ChannelId,
  ChannelPeriodSummary,
} from '../channelReport.types'
import { countsInProfit } from '../channelReport.types'
import { BUCKETS } from '../config/buckets'

/**
 * Pure helpers that combine per-channel metrics into what the screen shows.
 * Rule everywhere: `null` (not reported) is left out of a sum; a sum of only nulls stays null.
 */

export const sumNullable = (values: (number | null | undefined)[]): number | null =>
  values.some((value) => value !== null && value !== undefined)
    ? values.reduce<number>((total, value) => total + (value ?? 0), 0)
    : null

export const marginOf = (netProfit: number | null, sales: number | null): number | null =>
  netProfit === null || !sales ? null : (netProfit / sales) * 100

export interface ChannelShare {
  channel: ChannelId
  amount: number
  pct: number
}

export interface CombinedBucket {
  id: BucketId
  total: number | null
  perChannel: { channel: ChannelId; bucket: ChannelBucket | null }[]
}

export interface ChannelCounts {
  channel: ChannelId
  orders: number
  units: number
  refunds: number
}

export interface CombinedPeriod {
  period: ChannelPeriodSummary['period']
  salesChangePct: number | null
  channels: ChannelId[]
  orders: number
  units: number
  refunds: number
  /** Orders, units and refunds of each channel, in the applied order. */
  counts: ChannelCounts[]
  buckets: Record<BucketId, CombinedBucket>
  sales: number
  grossProfit: number
  netProfit: number
  margin: number | null
  shares: ChannelShare[]
}

/** Combines the applied channels of one period. Channels keep the order they were applied in. */
export const combinePeriod = (
  summary: ChannelPeriodSummary,
  appliedChannels: ChannelId[],
): CombinedPeriod => {
  const metrics = appliedChannels
    .map((channel) => summary.channels.find((item) => item.channel === channel))
    .filter((item): item is NonNullable<typeof item> => !!item)

  const buckets = Object.fromEntries(
    BUCKETS.map(({ id }) => {
      const perChannel = metrics.map((item) => ({ channel: item.channel, bucket: item.buckets[id] }))
      return [id, { id, perChannel, total: sumNullable(perChannel.map((entry) => entry.bucket?.amount)) }]
    }),
  ) as Record<BucketId, CombinedBucket>

  // Profit only counts buckets the channel deducts (a channel may show e.g. refund cost for information only)
  const profitOf = (ids: BucketId[]) =>
    ids.reduce(
      (total, id) =>
        total +
        buckets[id].perChannel.reduce((sum, { bucket }) => sum + (countsInProfit(bucket) ? bucket.amount : 0), 0),
      0,
    )

  const sales = buckets.sales.total ?? 0
  const grossProfit = profitOf(BUCKETS.filter((bucket) => bucket.inGrossProfit).map((bucket) => bucket.id))
  const netProfit = profitOf(BUCKETS.map((bucket) => bucket.id))

  return {
    period: summary.period,
    salesChangePct: summary.salesChangePct,
    channels: metrics.map((item) => item.channel),
    orders: metrics.reduce((total, item) => total + item.orders, 0),
    units: metrics.reduce((total, item) => total + item.units, 0),
    refunds: metrics.reduce((total, item) => total + item.refunds, 0),
    counts: metrics.map(({ channel, orders, units, refunds }) => ({ channel, orders, units, refunds })),
    buckets,
    sales,
    grossProfit,
    netProfit,
    margin: marginOf(netProfit, sales),
    shares: buckets.sales.perChannel.map(({ channel, bucket }) => ({
      channel,
      amount: bucket?.amount ?? 0,
      pct: sales ? ((bucket?.amount ?? 0) / sales) * 100 : 0,
    })),
  }
}
