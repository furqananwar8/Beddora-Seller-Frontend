'use client'

import React, { useRef, useState } from 'react'

import { FloatingMenu } from '@/features/inventory/shipments/ShipmentParts'
import type { ProductGrouping } from '@/services/api/profit.api'
import { cn } from '@/utils/cn'

const GROUPINGS: { value: ProductGrouping; label: string }[] = [
  { value: 'none', label: '—' },
  { value: 'asin', label: 'ASIN' },
  { value: 'parent', label: 'Parent' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'brand', label: 'Brand' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'channel', label: 'Channel' },
  { value: 'coupon', label: 'Coupon' },
]

interface GroupByMenuProps {
  value: ProductGrouping
  onChange: (value: ProductGrouping) => void
  splitByMarketplace: boolean
  onSplitByMarketplaceChange: (value: boolean) => void
}

const buttonLabel = (value: ProductGrouping) => {
  if (value === 'none') return 'No grouping'
  const label = GROUPINGS.find((grouping) => grouping.value === value)?.label ?? value
  return `Group by ${value === 'asin' ? label : label.toLowerCase()}`
}

/** The products table's "Group by" dropdown: what SKU rows group under, and whether SKUs split by marketplace. */
export function GroupByMenu({ value, onChange, splitByMarketplace, onSplitByMarketplaceChange }: GroupByMenuProps) {
  const anchor = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        ref={anchor}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-text-primary bg-surface-secondary/50 border border-border hover:bg-surface-secondary"
      >
        {buttonLabel(value)}
        <svg className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <FloatingMenu anchorRef={anchor} open={open} onClose={() => setOpen(false)} width={220}>
        <div role="menu" aria-label="Group by">
          {GROUPINGS.map((grouping) => (
            <button
              key={grouping.value}
              type="button"
              role="menuitemradio"
              aria-checked={value === grouping.value}
              onClick={() => {
                setOpen(false)
                onChange(grouping.value)
              }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-secondary-50',
                value === grouping.value && 'text-primary-600'
              )}
            >
              <span className="w-4 text-center" aria-hidden>{value === grouping.value ? '✓' : ''}</span>
              {grouping.label}
            </button>
          ))}
        </div>
        <label className="flex cursor-pointer items-center gap-2 border-t border-border px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            checked={splitByMarketplace}
            onChange={(event) => onSplitByMarketplaceChange(event.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          Split SKUs by marketplace
        </label>
      </FloatingMenu>
    </>
  )
}
