'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/design-system/buttons'
import type { BindingComponent, ChannelSku } from '@/services/api/skuMapping.api'
import { SKU_MAPPING_ROUTES } from './constants'

interface DeductionsPanelProps {
  channel: string
  row: ChannelSku | null
  components: BindingComponent[]
  readOnly: boolean
  onUnbind: (productId: number) => void
}

/** "1 unit of <SKU> deducts": the selected channel SKU's components, with Unbind. */
export const DeductionsPanel: React.FC<DeductionsPanelProps> = ({ channel, row, components, readOnly, onUnbind }) => {
  if (!row) {
    return <p className="rounded-md border border-dashed border-border px-4 py-3 text-sm text-text-muted">Select a channel SKU on the graph to see and edit what one unit of it deducts.</p>
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          1 unit of <span className="font-mono normal-case tracking-normal text-text-primary">{row.sku}</span> deducts
        </h2>
        {row.version !== null && (
          <Link href={SKU_MAPPING_ROUTES.history(channel, row.marketplace, row.sku)} className="text-xs font-medium text-primary-600 hover:underline">
            Binding history (v{row.version}) →
          </Link>
        )}
      </div>
      {components.length === 0 ? (
        <p className="mt-2 rounded-md border border-dashed border-border px-4 py-3 text-sm text-text-muted">
          No components yet. {readOnly ? '' : 'Drag from the channel SKU to an internal SKU on the graph, or use “+ Add internal SKU”.'}
        </p>
      ) : (
        <>
          {!readOnly && <p className="mt-1 text-xs text-text-muted">Edit a quantity by clicking its ×N badge on the graph.</p>}
          <ul className="mt-2 flex flex-wrap gap-2">
            {components.map((component) => (
              <li key={component.productId} className="flex items-center gap-4 rounded-md border border-border bg-surface py-1.5 pl-3 pr-1.5">
                <span className="min-w-0">
                  <span className="block font-mono text-xs text-text-primary">{component.sku}</span>
                  <span className="block max-w-[14rem] truncate text-xs text-text-muted">{component.name}</span>
                </span>
                <span className="text-sm font-semibold tabular-nums">×{component.quantity}</span>
                {!readOnly && (
                  <Button type="button" variant="outline" size="sm" className="text-danger-600 hover:border-danger-300 hover:bg-danger-50" onClick={() => onUnbind(component.productId)}>
                    Unbind
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
