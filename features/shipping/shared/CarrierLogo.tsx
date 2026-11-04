'use client'

import React, { useState } from 'react'
import { cn } from '@/utils/cn'
import type { ProviderId } from '../types'
import { brandOf, logoFile, type CarrierBrand } from './carrierBrands'
import { ProviderLogo } from './ProviderLogo'

interface CarrierLogoProps {
  /** The carrier that moves the parcel ("Canada Post"); preferred over the provider that sold it. */
  carrier?: string | null
  /** The provider (Shippo, Stallion…), for when the carrier has no logo. */
  provider: ProviderId
  size?: 'sm' | 'md'
  className?: string
}

const TILE = 'inline-flex shrink-0 items-center justify-center overflow-hidden'
type Size = 'xs' | 'sm' | 'md'
const tileSize = (size: Size) => ({ xs: 'h-4 w-4', sm: 'h-6 w-6', md: 'h-10 w-10' })[size]

/** One brand: its bundled mark, else its file in public/carriers/, else `fallback` (a missing file is detected when it fails to load). */
const BrandMark: React.FC<{ brand: CarrierBrand; size: Size; className?: string; fallback: React.ReactNode }> = ({ brand, size, className, fallback }) => {
  const [missing, setMissing] = useState(false)
  if (brand.icon) {
    return (
      <span className={cn(TILE, tileSize(size), className)} role="img" aria-label={brand.icon.title}>
        <svg viewBox="0 0 24 24" className="h-full w-full" fill={`#${brand.icon.hex}`} aria-hidden>
          <path d={brand.icon.path} />
        </svg>
      </span>
    )
  }
  if (missing) return <>{fallback}</>
  return (
    <span className={cn(TILE, tileSize(size), className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a small static brand file; a missing one falls back to initials */}
      <img src={logoFile(brand)} alt="" className="h-full w-full object-contain" onError={() => setMissing(true)} />
    </span>
  )
}

/**
 * The carrier's real logo, else the provider's, else the provider's initials. A carrier logo also carries a small
 * provider badge in its corner (Shippo, Stallion…) when the provider has a logo of its own.
 */
export const CarrierLogo: React.FC<CarrierLogoProps> = ({ carrier, provider, size = 'md', className }) => {
  const providerLogo = <ProviderLogo provider={provider} size={size} className={className} />
  const providerBrand = brandOf(provider)
  const carrierBrand = brandOf(carrier)
  const withProvider = providerBrand ? <BrandMark key={providerBrand.slug} brand={providerBrand} size={size} className={className} fallback={providerLogo} /> : providerLogo
  if (!carrierBrand) return withProvider
  const badge =
    providerBrand && providerBrand.slug !== carrierBrand.slug && size === 'md' ? (
      <span className="absolute -bottom-1 -right-1 drop-shadow">
        <BrandMark key={providerBrand.slug} brand={providerBrand} size="xs" className="rounded-full" fallback={null} />
      </span>
    ) : null
  return (
    <span className="relative inline-flex shrink-0">
      <BrandMark key={carrierBrand.slug} brand={carrierBrand} size={size} className={className} fallback={withProvider} />
      {badge}
    </span>
  )
}
