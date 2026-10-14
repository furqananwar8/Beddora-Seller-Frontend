'use client'

import React from 'react'

import { cn } from '@/utils/cn'

import { getChannel } from '../config/channels'
import type { ChannelShare } from '../lib/aggregate'
import { formatMoney } from '../lib/format'
import { ChannelDot } from './ChannelBadges'

interface ChannelShareBarProps {
  shares: ChannelShare[]
  /** Show "● Amazon 46% · $75,349.83" under the bar. */
  showLegend?: boolean
  /** `dark` for the blue banner, `light` for tiles. */
  tone?: 'dark' | 'light'
  className?: string
}

/** Stacked bar of each channel's share of sales. Renders nothing for a single channel. */
export const ChannelShareBar: React.FC<ChannelShareBarProps> = ({
  shares,
  showLegend = false,
  tone = 'light',
  className,
}) => {
  if (shares.length < 2) return null

  const label = shares.map((share) => `${getChannel(share.channel).name} ${Math.round(share.pct)}%`).join(', ')

  return (
    <div className={className}>
      <div
        role="img"
        aria-label={`Sales share: ${label}`}
        className={cn('flex w-full overflow-hidden rounded-sm gap-0.5', tone === 'dark' ? 'h-1.5' : 'h-1')}
      >
        {shares.map((share) => (
          <span
            key={share.channel}
            style={{ width: `${share.pct}%`, backgroundColor: getChannel(share.channel).color }}
          />
        ))}
      </div>

      {showLegend && (
        <div
          className={cn(
            'flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs',
            tone === 'dark' ? 'text-blue-100' : 'text-text-muted',
          )}
        >
          {shares.map((share) => (
            <span key={share.channel} className="inline-flex items-center gap-1.5">
              <ChannelDot channel={share.channel} className={tone === 'dark' ? 'ring-1 ring-white' : undefined} />
              <span className={tone === 'dark' ? 'text-white' : 'text-text-primary'}>
                {getChannel(share.channel).name}
              </span>
              <span className="font-semibold">{Math.round(share.pct)}%</span>
              <span>· {formatMoney(share.amount)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
