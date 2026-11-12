'use client'

import React from 'react'
import type { ProductPlatform } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'
import { PLATFORM_META, PLATFORMS } from '../shared/platformMeta'

interface PlatformRadioProps {
  id: string
  value: ProductPlatform
  onChange: (value: ProductPlatform) => void
  disabled?: boolean
}

/** Ecommerce (Beddora, blue) or Retail (Northern Linen, red): two radio buttons, the chosen one filled with its colour. */
export const PlatformRadio: React.FC<PlatformRadioProps> = ({ id, value, onChange, disabled }) => (
  <div role="radiogroup" aria-label="Platform" className="grid grid-cols-2 gap-2">
    {PLATFORMS.map((platform) => {
      const meta = PLATFORM_META[platform]
      const checked = value === platform
      return (
        <label
          key={platform}
          className={cn(
            'flex cursor-pointer flex-col rounded-lg border px-3 py-2 text-sm transition-colors focus-within:ring-2 focus-within:ring-primary-200',
            checked ? meta.solid : 'border-border bg-surface text-text-primary hover:bg-secondary-50',
            disabled && 'cursor-not-allowed opacity-60'
          )}
        >
          <input id={platform === PLATFORMS[0] ? id : `${id}-${platform.toLowerCase()}`} type="radio" name={id} value={platform} checked={checked} disabled={disabled} onChange={() => onChange(platform)} className="sr-only" />
          <span className="font-medium">{meta.label}</span>
          <span className={cn('text-xs', checked ? 'text-white/85' : 'text-text-muted')}>{meta.brand}</span>
        </label>
      )
    })}
  </div>
)
