'use client'

import React from 'react'
import { CountryFlag } from '@/components/flags/CountryFlag'
import { Spinner } from '@/design-system/loaders'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { formatCurrencyAmount, formatDay } from '@/features/finance/shared/format'
import { useGetSkuLandedTimelineQuery, type SkuLandedContainer } from '@/services/api/procurement.api'
import { containerLabel, ContainerStatusBadge, DESTINATION_LABEL } from '../../shared/poMeta'

const NUM = 'text-right whitespace-nowrap tabular-nums'

/** The purchase invoice lines that billed this SKU on the POs packed in one container. */
const InvoiceTable: React.FC<{ container: SkuLandedContainer }> = ({ container }) => (
  <Table className="min-w-full">
    <TableHeader>
      <TableRow>
        <TableHead>Purchase Invoice #</TableHead>
        <TableHead className={NUM}>Units</TableHead>
        <TableHead className={NUM}>Unit Price</TableHead>
        <TableHead className={NUM}>Total Amount</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {container.purchaseInvoices.length === 0 ? (
        <TableRow>
          <TableCell colSpan={4} className="py-4 text-center text-sm text-text-muted">
            Not invoiced yet: costed at the PO rate.
          </TableCell>
        </TableRow>
      ) : (
        container.purchaseInvoices.map((line) => (
          <TableRow key={line.id}>
            <TableCell className="font-medium">{line.invoiceNo}</TableCell>
            <TableCell className={NUM}>{line.units.toLocaleString('en-CA')}</TableCell>
            <TableCell className={NUM}>{formatCurrencyAmount(line.currency, line.unitPrice)}</TableCell>
            <TableCell className={NUM}>{formatCurrencyAmount(line.currency, line.totalAmount)}</TableCell>
          </TableRow>
        ))
      )}
    </TableBody>
  </Table>
)

const ContainerEntry: React.FC<{ container: SkuLandedContainer }> = ({ container }) => (
  <li className="overflow-hidden rounded-lg border border-border bg-surface">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary-50 px-4 py-2.5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <CountryFlag code={container.destination} title={DESTINATION_LABEL[container.destination]} />
        <span className="font-semibold text-text-primary">{containerLabel(container)}</span>
        <ContainerStatusBadge status={container.status} />
        <span className="text-text-muted">
          ETD {container.etd ? formatDay(container.etd) : '—'} · ETA {container.eta ? formatDay(container.eta) : '—'}
        </span>
      </div>
      <span className="text-text-secondary">
        {formatCurrencyAmount(container.currency, container.total)} / {container.units.toLocaleString('en-CA')} units ={' '}
        <span className="font-semibold tabular-nums text-text-primary">{formatCurrencyAmount(container.landedCurrency, container.unitCost)}</span>
      </span>
    </div>
    <InvoiceTable container={container} />
  </li>
)

/** Under a SKU's row: every container in transit or delivered that carries it, oldest first. Loads when opened. */
export const SkuLandedTimeline: React.FC<{ productId: number }> = ({ productId }) => {
  const { data, isLoading, isError } = useGetSkuLandedTimelineQuery(productId)
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }
  if (isError || !data) return <p className="py-6 text-center text-sm font-medium text-danger-600">Could not load this SKU&apos;s timeline.</p>
  if (data.containers.length === 0) return <p className="py-6 text-center text-sm text-text-muted">No container in transit or delivered carries this SKU yet.</p>

  return (
    <ol className="flex flex-col gap-3">
      {data.containers.map((container) => (
        <ContainerEntry key={container.id} container={container} />
      ))}
    </ol>
  )
}
