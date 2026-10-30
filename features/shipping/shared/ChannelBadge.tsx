import React from 'react'
import { cn } from '@/utils/cn'
import type { ChannelId } from '../types'

/** Placeholder marks until the channels' logo assets land: swap the badge for an <img> here and every screen follows. */
const MARK: Record<ChannelId, { initials: string; className: string }> = {
  walmart: { initials: 'WM', className: 'bg-blue-600 text-white' },
  amazon: { initials: 'AZ', className: 'bg-amber-500 text-black' },
  temu: { initials: 'TM', className: 'bg-orange-600 text-white' },
}

/** A sales channel's logo. */
export const ChannelBadge: React.FC<{ channel: ChannelId; className?: string }> = ({ channel, className }) => (
  <span aria-hidden className={cn('inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold', MARK[channel].className, className)}>
    {MARK[channel].initials}
  </span>
)
