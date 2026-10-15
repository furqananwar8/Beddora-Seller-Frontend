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

/** Child rows of a NestedGroup: indented from its guide line. */
const NESTED_ROW = 'pl-4 py-1.5'

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
        className={nested ? NESTED_ROW : undefined}
      />
    ))}
  </>
)

/** A bold heading row with its total, then its child rows indented under a guide line so they read as its children. */
const NestedGroup: React.FC<{
  label: React.ReactNode
  value: number
  formatValue: (value: number) => string
  children?: React.ReactNode
}> = ({ label, value, formatValue, children }) => (
  <>
    <DetailRow
      label={<span className="inline-flex items-center gap-1.5 font-semibold text-text-primary">{label}</span>}
      value={value}
      formatValue={formatValue}
      className="font-semibold"
    />
    {children && <div className="ml-[31px] mb-1 border-l-2 border-border">{children}</div>}
  </>
)

/**
 * One channel's block inside a combined section: channel · its own name for the section, and its total. A channel
 * that doesn't report the section keeps the same heading, valued n/a.
 */
const ChannelGroup: React.FC<{
  channel: ChannelId
  heading: string
  amount: number | null
  note?: string
  children?: React.ReactNode
}> = ({ channel, heading, amount, note, children }) => (
  <NestedGroup
    label={
      <>
        <ChannelDot channel={channel} />
        <span>{getChannel(channel).name}</span>
        <span>· {heading}</span>
        {note && <span className="font-normal italic text-text-muted">· {note}</span>}
      </>
    }
    value={amount ?? 0}
    formatValue={(value) => (amount === null ? 'n/a' : formatMoney(value))}
  >
    {children}
  </NestedGroup>
)

/**
 * A section's count (e.g. refund count): a bold total, then one nested line per channel when several are combined.
 * A channel shows n/a only when it reports neither the section nor any count (Walmart's live view books returns in
 * Sales, yet counts them).
 */
const CountLines: React.FC<{
  period: CombinedPeriod
  definition: BucketDefinition
  count: NonNullable<BucketDefinition['count']>
  single: boolean
}> = ({ period, definition, count, single }) => {
  const reports = (channel: ChannelId) =>
    period.buckets[definition.id].perChannel.some((entry) => entry.channel === channel && entry.bucket)
  const label = <span>{count.label}</span>
  const total = period[count.key]
  const formatCount = (value: number) => formatNumber(value, 0)
  if (single) return <NestedGroup label={label} value={total} formatValue={formatCount} />

  return (
    <NestedGroup label={label} value={total} formatValue={formatCount}>
      {period.counts.map((channelCounts) => (
        <DetailRow
          key={channelCounts.channel}
          label={<ChannelName channel={channelCounts.channel} />}
          value={channelCounts[count.key]}
          formatValue={(value) => (reports(channelCounts.channel) || value !== 0 ? formatNumber(value, 0) : 'n/a')}
          className={NESTED_ROW}
        />
      ))}
    </NestedGroup>
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
          <ChannelGroup
            key={channel}
            channel={channel}
            heading={bucket.nativeGroup}
            amount={bucket.amount}
            note={bucket.inProfit === false ? 'not in profit' : undefined}
          >
            {bucket.lines.length > 0 && <BucketLines bucket={bucket} nested />}
          </ChannelGroup>
        ) : (
          <ChannelGroup key={channel} channel={channel} heading={definition.label} amount={null} note="not reported" />
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
      <MetricRow label="Margin" value={formatMargin(period.margin)} />

      <p className="pt-3 text-xs text-text-muted">
        Each section totals every selected channel. Lines keep each channel&apos;s own wording; &quot;n/a&quot; costs
        are not reported by the channel and are left out of the total rather than counted as $0.
      </p>
    </div>
  )
}
