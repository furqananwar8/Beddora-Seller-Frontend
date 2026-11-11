'use client'

import React from 'react'
import Link from 'next/link'
import type { ContainerDetail } from '@/services/api/procurement.api'
import { formatCurrencyAmount } from '@/features/finance/shared/format'
import { PaymentBadge } from '../../shared/poMeta'
import { ViewPoPaymentRequests } from '../../shared/PoPaymentRequests'
import { ExpandablePanel, Fact, PanelEmpty } from './Panel'

const qty = (value: number) => value.toLocaleString('en-CA')
/** How many purchase orders the summary lists before "+ n more". */
const SUMMARY_ROWS = 3

type ContainerPo = ContainerDetail['purchaseOrders'][number]

/** Paid against the PO's price; falls back to what was requested when the PO has no rates. */
function paidPercent(po: ContainerPo): number {
  const price = po.price?.amount ?? 0
  const base = price > 0 ? price : po.payment.requestedAmount
  return base > 0 ? Math.min(100, Math.round((po.payment.paidAmount / base) * 100)) : 0
}

const PaidBar: React.FC<{ po: ContainerPo; percent: number }> = ({ po, percent }) => (
  <div className="h-2 overflow-hidden !rounded-full bg-secondary-100" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`${po.poNo} paid`}>
    <div className="h-full bg-success-600" style={{ width: `${percent}%` }} />
  </div>
)

/** The major stats: how many POs, units and payment requests, then the first few POs with how much of each is paid. */
const Summary: React.FC<{ container: ContainerDetail }> = ({ container }) => {
  const pos = container.purchaseOrders
  const shown = pos.slice(0, SUMMARY_ROWS)
  return (
    <>
      <div className="grid grid-cols-3 gap-2 rounded-lg bg-secondary-50 px-3 py-2">
        <Fact label="POs">{qty(pos.length)}</Fact>
        <Fact label="Units here">{qty(pos.reduce((sum, po) => sum + po.units, 0))}</Fact>
        <Fact label="Pay requests">{qty(pos.reduce((sum, po) => sum + po.payment.requestCount, 0))}</Fact>
      </div>
      <ul className="flex flex-col gap-2.5">
        {shown.map((po) => {
          const percent = paidPercent(po)
          return (
            <li key={po.id} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <Link href={`/dashboard/procurement/purchase-orders/${po.id}`} className="font-mono text-sm font-semibold text-text-primary underline-offset-2 hover:underline">
                  {po.poNo}
                </Link>
                <PaymentBadge payment={po.payment} />
              </div>
              <p className="truncate text-xs text-text-muted">{po.supplier?.name ?? '—'}</p>
              <PaidBar po={po} percent={percent} />
            </li>
          )
        })}
      </ul>
      {pos.length > shown.length && <p className="text-xs text-text-muted">+ {pos.length - shown.length} more</p>}
    </>
  )
}

/** Every purchase order in the container with its price and what has been paid on it. */
const Details: React.FC<{ container: ContainerDetail }> = ({ container }) => (
  <div className="grid gap-3">
    {container.purchaseOrders.map((po) => {
      const paid = po.payment.paidAmount
      const percent = paidPercent(po)
      return (
        <article key={po.id} className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link href={`/dashboard/procurement/purchase-orders/${po.id}`} className="font-mono text-sm font-semibold text-text-primary underline-offset-2 hover:underline">
                {po.poNo}
              </Link>
              <p className="text-xs text-text-muted">
                {po.supplier?.name ?? '—'} · in{' '}
                {container.packagingLists
                  .filter((list) => container.lines.some((line) => line.purchaseOrderId === po.id && line.plNo === list.plNo))
                  .map((list, index) => (
                    <React.Fragment key={list.id}>
                      {index > 0 && ', '}
                      <Link href={`/dashboard/procurement/packaging-lists/${list.id}`} className="underline-offset-2 hover:underline">
                        {list.plNo}
                      </Link>
                    </React.Fragment>
                  ))}
              </p>
            </div>
            <PaymentBadge payment={po.payment} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Fact label="PO price">{po.price?.amount != null ? formatCurrencyAmount(po.price.currency, po.price.amount) : 'No rates yet'}</Fact>
            <Fact label="Units here / ordered">
              {qty(po.units)} / {qty(po.price?.units ?? 0)}
            </Fact>
            <Fact label="Requested">{po.price ? formatCurrencyAmount(po.price.currency, po.payment.requestedAmount) : '—'}</Fact>
            <Fact label="Paid">{po.price ? formatCurrencyAmount(po.price.currency, paid) : '—'}</Fact>
          </div>
          <div>
            <PaidBar po={po} percent={percent} />
            <div className="mt-1 flex justify-between text-xs text-text-muted">
              <span>{percent}% of the PO price paid</span>
              <ViewPoPaymentRequests
                purchaseOrder={{ id: po.id, poNo: po.poNo }}
                label={`${po.payment.requestCount} payment request${po.payment.requestCount === 1 ? '' : 's'}`}
                className="font-medium text-primary-600 underline-offset-2 hover:underline"
              />
            </div>
          </div>
        </article>
      )
    })}
  </div>
)

/** PO > packaging list > payments: the container's purchase orders as stats, the full cards behind "More". */
export const PurchaseOrdersPanel: React.FC<{ container: ContainerDetail }> = ({ container }) => {
  const empty = container.packagingLists.length === 0
  return (
    <ExpandablePanel title="Purchase orders" count={container.purchaseOrders.length} modalTitle="Purchase orders" hasMore={!empty} summary={empty ? <PanelEmpty>No packaging list in this container yet.</PanelEmpty> : <Summary container={container} />}>
      <Details container={container} />
    </ExpandablePanel>
  )
}
