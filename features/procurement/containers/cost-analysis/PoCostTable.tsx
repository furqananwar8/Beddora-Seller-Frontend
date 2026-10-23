'use client'

import React from 'react'
import type { ContainerCostDetail } from '@/services/api/procurement.api'
import type { CostColumn } from './costColumns'
import { CostTable } from './CostTable'

type CostOrder = ContainerCostDetail['purchaseOrders'][number]

/** One PO of a container: a row per SKU of its packaging list with each cost, and the PO's totals in the footer. */
export const PoCostTable: React.FC<{ order: CostOrder; columns: CostColumn[] }> = ({ order, columns }) => (
  <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
    <header className="flex flex-wrap items-baseline gap-x-2 border-b border-border px-4 py-2.5">
      <h3 className="text-sm font-semibold text-text-primary">{order.supplier?.name ?? 'Unknown supplier'}</h3>
      <span className="font-mono text-xs text-text-muted">{order.poNo}</span>
      <span className="text-xs text-text-muted">· {order.invoices.length === 0 ? 'No invoice yet: PO rates, no additional expense' : order.invoices.map((invoice) => invoice.invoiceNo).join(', ')}</span>
    </header>
    <CostTable columns={columns} rows={order.skus} rowKey={(row) => row.productId} totals={order.totals} />
  </section>
)
