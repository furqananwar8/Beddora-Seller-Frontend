import React from 'react'
import type { OrderLineSource } from '../create/shipmentSchema'

interface OrderSkuCellProps {
  /** The marketplace SKU(s) of the order lines behind a product row. */
  sources: OrderLineSource[]
  /** Our SKU they map to. */
  internalSku: string | null
  /** Our units the row takes from stock. */
  units: number
}

/**
 * A product row's SKUs: the marketplace's as the order has it, and under it, small, our own with the units it
 * deducts from stock. Long SKUs scroll sideways so they are always readable in full.
 */
export const OrderSkuCell: React.FC<OrderSkuCellProps> = ({ sources, internalSku, units }) => (
  <div className="max-w-[240px] overflow-x-auto whitespace-nowrap pb-1" tabIndex={0}>
    {sources.map((source) => (
      <div key={source.sku} className="font-mono text-xs text-text-primary">
        {source.sku}
      </div>
    ))}
    <div className="font-mono text-[11px] text-text-muted">
      {internalSku ?? '—'} × {units} {units === 1 ? 'unit' : 'units'}
    </div>
  </div>
)
