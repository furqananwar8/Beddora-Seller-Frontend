import React from 'react'
import { cn } from '@/utils/cn'
import type { ProviderId } from '../types'

/** Placeholder marks until the providers' logo assets land: swap the badge for an <img> here and every screen follows. */
const MARK: Record<ProviderId, { initials: string; className: string }> = {
  stallion: { initials: 'ST', className: 'bg-orange-500 text-white' },
  shippo: { initials: 'SH', className: 'bg-emerald-600 text-white' },
  uniuni: { initials: 'UU', className: 'bg-sky-600 text-white' },
}

interface ProviderLogoProps {
  provider: ProviderId
  /** sm in table rows, md on cards. */
  size?: 'sm' | 'md'
  className?: string
}

/** A provider's logo. */
export const ProviderLogo: React.FC<ProviderLogoProps> = ({ provider, size = 'md', className }) => (
  <span
    aria-hidden
    className={cn(
      'inline-flex shrink-0 items-center justify-center rounded-md font-bold',
      size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-10 w-10 text-xs',
      MARK[provider].className,
      className
    )}
  >
    {MARK[provider].initials}
  </span>
)
