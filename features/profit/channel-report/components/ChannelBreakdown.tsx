'use client'

import React, { useState } from 'react'

import { DetailRow, MetricRow } from '@/features/profit/dashboard/components/TileDetailsModal'
import { formatNumber } from '@/utils/format'

import type { BucketId, ChannelBucket, ChannelId } from '../channelReport.types'
import { COST_BUCKETS, type BucketDefinition } from '../config/buckets'
import { getChannel } from '../config/channels'
import type { CombinedBucket, CombinedPeriod } from '../lib/aggregate'
import { formatMargin, formatMoney } from '../lib/format'
import { ChannelDot } from './ChannelBadges'

/**
 * Body of the tile breakdown modal (rendered through TileDetailsModal's `renderBody`), built from the same
 * MetricRow / DetailRow as the Settlement Report breakdown.
 * Several channels: generic section titles with a block per channel. One channel: the channel's own wording.
 */

interface ChannelBreakdownProps {
  period: CombinedPeriod
  /** Cost sections to list. Defaults to every cost bucket; a product row passes the per-listing ones. */
  sections?: BucketDefinition[]
}

const SALES_KEY = 'sales'
const COUNTS_KEY = 'counts'

const ordersAndUnits = (orders: number, units: number) => `${formatNumber(orders, 0)} / ${formatNumber(units, 0)}`

const ChannelName: React.FC<{ channel: ChannelId }> = ({ channel }) => (
  <span className="inline-flex items-center gap-1.5">
    <ChannelDot channel={channel} />
    {getChannel(channel).name}
  </span>
)

const NotReported: React.FC<{ channel: ChannelId; definition: BucketDefinition }> = ({ channel, definition }) => (
  <div className="py-2 pl-7 text-sm italic text-text-muted">
    {getChannel(channel).name}: {definition.notReportedText}
  </div>
)

const BucketLines: React.FC<{ bucket: ChannelBucket; nested?: boolean }> = ({
  bucket,
  nested = false,
}) => (
  <>
    {bucket.lines.map((line) => (
      <DetailRow
        key={line.label}
        label={line.label}
        value={line.amount}
        formatValue={formatMoney}
        className={nested ? 'pl-12 py-1.5' : undefined}
      />
    ))}
  </>
)

/**
 * A section's count (e.g. refund count): the total, then one line per channel when several are combined.
 * A channel that does not report the section shows n/a rather than 0.
 */
const CountLines: React.FC<{
  period: CombinedPeriod
  definition: BucketDefinition
  count: NonNullable<BucketDefinition['count']>
  single: boolean
}> = ({ period, definition, count, single }) => {
  const reports = (channel: ChannelId) =>
    period.buckets[definition.id].perChannel.some((entry) => entry.channel === channel && entry.bucket)
  return (
    <>
      <div className="flex items-center justify-between py-2 pl-7 text-sm text-text-muted">
        <span>{count.label}</span>
        <span className="text-text-primary">{formatNumber(period[count.key], 0)}</span>
      </div>
      {!single &&
        period.counts.map((channelCounts) => (
          <DetailRow
            key={channelCounts.channel}
            label={<ChannelName channel={channelCounts.channel} />}
            value={channelCounts[count.key]}
            formatValue={(value) => (reports(channelCounts.channel) ? formatNumber(value, 0) : 'n/a')}
            className="pl-12 py-1.5"
          />
        ))}
    </>
  )
}

const SectionDetails: React.FC<{
  definition: BucketDefinition
  combined: CombinedBucket
  single: boolean
}> = ({ definition, combined, single }) => {
  if (single) {
    const { channel, bucket } = combined.perChannel[0]
    return bucket ? <BucketLines bucket={bucket} /> : <NotReported channel={channel} definition={definition} />
  }

  return (
    <>
      {combined.perChannel.map(({ channel, bucket }) =>
        bucket ? (
          <React.Fragment key={channel}>
            <DetailRow
              label={
                <span className="inline-flex items-center gap-1.5">
                  <ChannelDot channel={channel} />
                  <span className="font-medium text-text-primary">{getChannel(channel).name}</span>
                  <span>· {bucket.nativeGroup}</span>
                  {bucket.inProfit === false && <span className="italic">· not in profit</span>}
                </span>
              }
              value={bucket.amount}
              formatValue={formatMoney}
            />
            <BucketLines bucket={bucket} nested />
          </React.Fragment>
        ) : (
          <NotReported key={channel} channel={channel} definition={definition} />
        ),
      )}
    </>
  )
}

export const ChannelBreakdown: React.FC<ChannelBreakdownProps> = ({ period, sections = COST_BUCKETS }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const single = period.channels.length === 1
  const toggle = (key: string) => setExpanded((previous) => ({ ...previous, [key]: !previous[key] }))

  const sectionTitle = (id: BucketId, fallback: string) => {
    const title = (single && period.buckets[id].perChannel[0]?.bucket?.nativeGroup) || fallback
    // Shown for information only when no channel deducts it from profit
    const informational = period.buckets[id].perChannel.every(({ bucket }) => !bucket || bucket.inProfit === false)
    const reported = period.buckets[id].perChannel.some(({ bucket }) => bucket)
    return reported && informational ? `${title} (not in profit)` : title
  }

  return (
    <div className="space-y-0">
      <MetricRow
        label="Sales"
        value={formatMoney(period.sales)}
        isExpandable={!single}
        isOpen={!!expanded[SALES_KEY]}
        onClick={single ? undefined : () => toggle(SALES_KEY)}
      />
      {!single && expanded[SALES_KEY] && (
        <div className="border-b border-border">
          {period.buckets.sales.perChannel.map(({ channel, bucket }) => (
            <DetailRow
              key={channel}
              label={<ChannelName channel={channel} />}
              value={bucket?.amount ?? 0}
              formatValue={formatMoney}
            />
          ))}
        </div>
      )}

      <MetricRow
        label="Orders / Units"
        value={ordersAndUnits(period.orders, period.units)}
        isExpandable={!single}
        isOpen={!!expanded[COUNTS_KEY]}
        onClick={single ? undefined : () => toggle(COUNTS_KEY)}
      />
      {!single && expanded[COUNTS_KEY] && (
        <div className="border-b border-border">
          {period.counts.map(({ channel, orders, units }) => (
            <DetailRow
              key={channel}
              label={<ChannelName channel={channel} />}
              value={orders}
              formatValue={() => ordersAndUnits(orders, units)}
            />
          ))}
        </div>
      )}

      {sections.map((definition) => (
        <React.Fragment key={definition.id}>
          <MetricRow
            label={sectionTitle(definition.id, definition.label)}
            value={formatMoney(period.buckets[definition.id].total)}
            isExpandable
            isOpen={!!expanded[definition.id]}
            onClick={() => toggle(definition.id)}
          />
          {expanded[definition.id] && (
            <div className="border-b border-border">
              <SectionDetails
                definition={definition}
                combined={period.buckets[definition.id]}
                single={single}
              />
              {definition.count && period[definition.count.key] > 0 && (
                <CountLines period={period} definition={definition} count={definition.count} single={single} />
              )}
            </div>
          )}
        </React.Fragment>
      ))}

      <MetricRow label="Gross profit" value={formatMoney(period.grossProfit)} isBold />
      <MetricRow label="Net profit" value={formatMoney(period.netProfit)} isBold />
      <MetricRow label="Margin" value={formatMargin(period.margin)} />

      <p className="pt-3 text-xs text-text-muted">
        Each section totals every selected channel. Lines keep each channel&apos;s own wording; &quot;n/a&quot; costs
        are not reported by the channel and are left out of the total rather than counted as $0.
      </p>
    </div>
  )
}
