'use client'

import React, { useState } from 'react'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import type { PricingLine } from './useAmazonPricing'

/**
 * The listing's details that are not columns: its title and the sheet's other descriptive columns (parent, fulfilment,
 * status, product type, size, pack quantity, dimensions, weight, size tier and volume). The SKU is a button that opens
 * them in a modal.
 */

const withUnit = (value: number | undefined, unit: string | undefined) => (value === undefined ? '—' : `${value}${unit ? ` ${unit}` : ''}`)

function detailsOf({ row, duplicate, result }: PricingLine): Array<[label: string, value: string]> {
  const { dimensions, weight } = row
  return [
    ['ASIN', row.asin || '—'],
    ['Parent', row.parentSku || '—'],
    ['FBM / FBA', row.fulfillment],
    ['Duplicate', duplicate ? 'Duplicate' : 'Unique'],
    ['Status', row.status || '—'],
    ['Product type', row.productType || '—'],
    // not held on the listing
    ['Size', '—'],
    ['Pack qty', '—'],
    ['Longest side', withUnit(dimensions?.longest, dimensions?.unit)],
    ['Median side', withUnit(dimensions?.median, dimensions?.unit)],
    ['Shortest side', withUnit(dimensions?.shortest, dimensions?.unit)],
    ['Package weight', withUnit(weight?.value, weight?.unit)],
    ['Size tier', result.sizeTier ?? '—'],
    ['Cubic meters', result.cubicMeters === null ? '—' : result.cubicMeters.toFixed(6)],
  ]
}

export const SkuDetails: React.FC<{ line: PricingLine }> = ({ line }) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="View product details"
        className="block w-full truncate text-left font-medium text-primary-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        {line.row.sku}
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title={line.row.sku} size="md">
        <div className="text-sm font-semibold leading-snug text-text-primary">{line.row.title}</div>
        <dl className="mt-3 grid grid-cols-[140px_1fr] gap-x-4 gap-y-2 border-t border-border pt-3 text-sm">
          {detailsOf(line).map(([label, value]) => (
            <React.Fragment key={label}>
              <dt className="text-text-muted">{label}</dt>
              <dd className="break-words text-text-primary">{value}</dd>
            </React.Fragment>
          ))}
        </dl>
        <div className="mt-6 flex justify-end">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </>
  )
}
