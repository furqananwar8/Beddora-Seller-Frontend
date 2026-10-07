'use client'

import React from 'react'
import Link from 'next/link'
import type { ContainerDetail } from '@/services/api/procurement.api'
import { formatCurrencyAmount } from '@/features/finance/shared/format'
import { PaymentBadge, poPaymentRequestsHref } from '../../shared/poMeta'
import { Fact, Panel, PanelEmpty } from './Panel'

const qty = (value: number) => value.toLocaleString('en-CA')

/** PO > packaging list > payments: each purchase order in the container with its price and what has been paid on it. */
export const PurchaseOrdersPanel: React.FC<{ container: ContainerDetail }> = ({ container }) => {
  const list = container.packagingList
  return (
    <Panel title="Purchase orders" count={container.purchaseOrders.length}>
      {!list ? (
        <PanelEmpty>No packaging list in this container yet.</PanelEmpty>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {container.purchaseOrders.map((po) => {
            const paid = po.payment.paidAmount
            const price = po.price?.amount ?? 0
            // Paid against the PO's price; falls back to what was requested when the PO has no rates
            const base = price > 0 ? price : po.payment.requestedAmount
            const percent = base > 0 ? Math.min(100, Math.round((paid / base) * 100)) : 0
            return (
              <article key={po.id} className="flex flex-col gap-3 rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/dashboard/procurement/purchase-orders/${po.id}`} className="font-mono text-sm font-semibold text-text-primary underline-offset-2 hover:underline">
                      {po.poNo}
                    </Link>
                    <p className="truncate text-xs text-text-muted">
                      {po.supplier?.name ?? '—'} · in{' '}
                      <Link href={`/dashboard/procurement/packaging-lists/${list.id}`} className="underline-offset-2 hover:underline">
                        {list.plNo}
                      </Link>
                    </p>
                  </div>
                  <PaymentBadge payment={po.payment} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Fact label="PO price">{po.price?.amount != null ? formatCurrencyAmount(po.price.currency, po.price.amount) : 'No rates yet'}</Fact>
                  <Fact label="Units here / ordered">
                    {qty(po.units)} / {qty(po.price?.units ?? 0)}
                  </Fact>
                  <Fact label="Requested">{po.price ? formatCurrencyAmount(po.price.currency, po.payment.requestedAmount) : '—'}</Fact>
                  <Fact label="Paid">{po.price ? formatCurrencyAmount(po.price.currency, paid) : '—'}</Fact>
                </div>
                <div>
                  <div className="h-2 overflow-hidden !rounded-full bg-secondary-100" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`${po.poNo} paid`}>
                    <div className="h-full bg-success-600" style={{ width: `${percent}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-text-muted">
                    <span>{percent}% of the PO price paid</span>
                    <Link href={poPaymentRequestsHref(po.id)} className="font-medium text-primary-600 underline-offset-2 hover:underline">
                      {po.payment.requestCount} payment request{po.payment.requestCount === 1 ? '' : 's'}
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </Panel>
  )
}
