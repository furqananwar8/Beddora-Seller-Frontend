'use client'

import React from 'react'

import { cn } from '@/utils/cn'

import type { ChannelId } from '../channelReport.types'
import { getChannel } from '../config/channels'

/** Colour dot for a channel. Decorative: always render the channel name next to it. */
export const ChannelDot: React.FC<{ channel: ChannelId; className?: string }> = ({ channel, className }) => (
  <span
    aria-hidden="true"
    className={cn('inline-block w-2.5 h-2.5 rounded-full flex-shrink-0', className)}
    style={{ backgroundColor: getChannel(channel).color }}
  />
)

/** Dot + channel name. */
export const ChannelLabel: React.FC<{ channel: ChannelId; className?: string }> = ({ channel, className }) => (
  <span className={cn('inline-flex items-center gap-1.5', className)}>
    <ChannelDot channel={channel} />
    <span>{getChannel(channel).name}</span>
  </span>
)

/** Overlapping dots for several channels; the names go in the title for screen readers and hover. */
export const ChannelDots: React.FC<{ channels: ChannelId[]; className?: string }> = ({ channels, className }) => (
  <span
    className={cn('inline-flex items-center -space-x-1', className)}
    title={channels.map((channel) => getChannel(channel).name).join(', ')}
  >
    {channels.map((channel) => (
      <ChannelDot key={channel} channel={channel} className="ring-2 ring-surface" />
    ))}
  </span>
)

/** Bordered chips: "● Amazon  ● Walmart". */
export const ChannelChips: React.FC<{ channels: ChannelId[]; className?: string }> = ({ channels, className }) => (
  <div className={cn('flex flex-wrap gap-1.5', className)}>
    {channels.map((channel) => (
      <ChannelLabel
        key={channel}
        channel={channel}
        className="px-2 py-0.5 text-xs border border-border rounded text-text-primary"
      />
    ))}
  </div>
)
