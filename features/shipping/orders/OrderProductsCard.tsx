'use client'

import React from 'react'
import Link from 'next/link'
import { useFormContext, useWatch } from 'react-hook-form'
import { ProductPhoto } from '@/features/procurement/shared/ProductPhoto'
import { formatWeight } from '@/features/procurement/shared/units'
import { UNITS } from '../create/shipmentForm'
import type { ShipmentFormValues } from '../create/shipmentSchema'
import { SectionCard } from '../shared/Card'
import { OrderSkuCell } from '../shared/OrderSkuCell'
import { SKU_MAPPER_HREF } from '../shippingMeta'
import type { ChannelOrderDetailLine } from '../types'

const HEAD = 'px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-text-muted'
const CELL = 'px-3 py-2 align-middle text-sm'

/**
 * The products of the order being booked, read-only: each marketplace SKU with the product of ours it maps to (and
 * how many units it takes from stock). A SKU with no mapping says so; it must be mapped before rates can be fetched.
 */
export const OrderProductsCard: React.FC<{ unmapped: ChannelOrderDetailLine[] }> = ({ unmapped }) => {
  const { control } = useFormContext<ShipmentFormValues>()
  const products = useWatch({ control, name: 'products' })
  const units = useWatch({ control, name: 'units' })

  return (
    <SectionCard title="Products" subtitle="from the order">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className={HEAD} aria-label="Photo" />
              <th className={HEAD}>Product</th>
              <th className={HEAD}>SKU</th>
              <th className={HEAD}>Units</th>
              <th className={HEAD}>Unit wt</th>
            </tr>
          </thead>
          <tbody>
            {products.map(({ product, quantity, sources = [] }) => (
              <tr key={product.id} className="border-b border-border last:border-0">
                <td className={CELL}>
                  <ProductPhoto productId={product.id} hasPhoto={product.hasPhoto} version="" alt={product.name} basePath="/shipping/products" />
                </td>
                <td className={CELL}>
                  <span className="font-medium text-text-primary">{product.name}</span>
                  {product.variantName && <span className="block text-xs text-text-muted">Variation · {product.variantName}</span>}
                </td>
                <td className={CELL}>
                  <OrderSkuCell sources={sources} internalSku={product.sku} units={Number(quantity)} />
                </td>
                <td className={`${CELL} tabular-nums`}>{quantity}</td>
                <td className={`${CELL} whitespace-nowrap`}>{formatWeight(product.weight, UNITS[units].weight)}</td>
              </tr>
            ))}
            {unmapped.map((line) => (
              <tr key={line.sku} className="border-b border-border last:border-0">
                <td className={CELL} />
                <td className={`${CELL} text-danger-600`}>
                  No product mapping found
                  <span className="block text-xs text-text-muted">{line.productName}</span>
                </td>
                <td className={CELL}>
                  <div className="max-w-[240px] overflow-x-auto whitespace-nowrap font-mono text-xs text-text-primary" tabIndex={0}>
                    {line.sku}
                  </div>
                  <Link href={SKU_MAPPER_HREF} className="text-xs text-primary-600 hover:underline">
                    Map it in the SKU Mapper
                  </Link>
                </td>
                <td className={`${CELL} tabular-nums`}>{line.quantity}</td>
                <td className={CELL}>—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  )
}
