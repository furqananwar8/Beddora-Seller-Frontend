import React from 'react'
import { SectionCard } from '../shared/Card'
import { ChannelBadge } from '../shared/ChannelBadge'
import { shortDateTime, titleCase } from '../shippingMeta'
import type { ChannelOrderDetail } from '../types'

/** The order being booked: channel, ids, where it goes and what is in it. */
export const OrderSummaryCard: React.FC<{ detail: ChannelOrderDetail }> = ({ detail }) => {
  const { order } = detail
  return (
    <SectionCard
      title={
        <span className="inline-flex items-center gap-2">
          <ChannelBadge channel={order.channel} />
          Order {order.orderId}
        </span>
      }
      subtitle={`${order.channelLabel} ${order.marketLabel} · ${shortDateTime(order.orderDate)} · ${titleCase(order.channelStatus)}`}
    >
      <div className="text-sm">
        {order.customerOrderId && <p className="mb-2 text-xs text-text-muted">Customer order {order.customerOrderId}</p>}
        <div>
          <div className="text-xs text-text-muted">Items</div>
          <ul className="space-y-1">
            {detail.lines.map((line, index) => (
              <li key={`${line.lineNumber}-${index}`}>
                <span className="font-mono text-xs">
                  {line.sku} × {line.quantity}
                </span>{' '}
                <span className="text-text-muted">{line.product ? (line.unitsPerItem > 1 ? `${line.product.name} × ${line.unitsPerItem} per item` : line.product.name) : line.productName}</span>
                {!line.product && <span className="ml-1 rounded-full bg-warning-50 px-2 py-0.5 text-xs text-warning-700">Not mapped</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionCard>
  )
}
