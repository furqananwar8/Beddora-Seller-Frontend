'use client'

import React from 'react'
import Link from 'next/link'
import { MarketplaceFlag } from '@/components/marketplace-flag/MarketPlaceFlag'
import type { PoDestination } from '@/services/api/procurement.api'
import { DESTINATION_LABEL } from '../../shared/poMeta'
import { CONTAINER_ROUTES } from '../routes'

interface ContainerCellProps {
  container: { id: number; containerNo: string; containerNumber: string | null; destination: PoDestination }
  /** The line under the reference, e.g. "2 SKUs · 1,500 units". */
  detail: React.ReactNode
}

/** A container's identity in a listing: country flag, its number (linking to its page), our reference, then a summary line. */
export const ContainerCell: React.FC<ContainerCellProps> = ({ container, detail }) => (
  <div className="min-w-0">
    <div className="flex items-center gap-2">
      <MarketplaceFlag marketplace={container.destination} className="shadow-sm" />
      <span className="sr-only">{DESTINATION_LABEL[container.destination]}</span>
      <Link href={CONTAINER_ROUTES.detail(container.id)} className="whitespace-nowrap font-mono text-sm font-semibold text-text-primary underline-offset-2 hover:underline">
        {container.containerNumber ?? 'No number yet'}
      </Link>
    </div>
    <p className="whitespace-nowrap font-mono text-[11px] text-text-muted">{container.containerNo}</p>
    <p className="whitespace-nowrap text-xs text-text-muted">{detail}</p>
  </div>
)

export const skuSummary = (skus: number, units: number) => (skus === 0 ? 'Empty' : `${skus} SKU${skus === 1 ? '' : 's'} · ${units.toLocaleString('en-CA')} units`)
