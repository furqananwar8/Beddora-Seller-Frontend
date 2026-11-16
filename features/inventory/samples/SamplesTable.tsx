'use client'

import Link from 'next/link'
import React from 'react'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableStatusRow } from '@/design-system/tables'
import type { SampleItem } from '@/services/api/samples.api'
import { SAMPLE_STATUS_META, sampleAmount, sampleDay } from './sampleMeta'

const CELL = 'text-center align-middle'
const COLUMNS = ['SKU', 'Supplier', 'PO', 'Units', 'Type', 'Amount', 'Payment', 'Paid on', 'In inventory']

interface SamplesTableProps {
  rows: SampleItem[] | undefined
  isLoading: boolean
  isError: boolean
}

/** One row per sample entry across all POs. Information only: samples never change stock. */
export const SamplesTable: React.FC<SamplesTableProps> = ({ rows, isLoading, isError }) => (
  <div className="overflow-hidden rounded-lg border border-border shadow-sm">
    <Table className="min-w-full">
      <TableHeader>
        <TableRow>
          {COLUMNS.map((label) => (
            <TableHead key={label} className="whitespace-nowrap text-center">
              {label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableStatusRow colSpan={COLUMNS.length} loading />
        ) : isError ? (
          <TableStatusRow colSpan={COLUMNS.length} tone="danger">
            Could not load the samples.
          </TableStatusRow>
        ) : !rows || rows.length === 0 ? (
          <TableStatusRow colSpan={COLUMNS.length}>No sample matches these filters.</TableStatusRow>
        ) : (
          rows.map((sample) => {
            const status = SAMPLE_STATUS_META[sample.status]
            return (
              <TableRow key={sample.id}>
                <TableCell className={CELL}>
                  <div className="font-semibold text-text-primary">{sample.product.sku ?? '—'}</div>
                  <div className="text-xs text-text-muted">{sample.product.name}</div>
                </TableCell>
                <TableCell className={CELL}>{sample.supplier.name}</TableCell>
                <TableCell className={CELL}>
                  <Link href={`/dashboard/procurement/purchase-orders/${sample.purchaseOrder.id}`} className="font-medium text-primary-600 hover:underline">
                    {sample.purchaseOrder.poNo}
                  </Link>
                </TableCell>
                <TableCell className={`${CELL} tabular-nums`}>{sample.units.toLocaleString('en-CA')}</TableCell>
                <TableCell className={CELL}>{sample.isFree ? 'Free' : 'Chargeable'}</TableCell>
                <TableCell className={`${CELL} whitespace-nowrap tabular-nums`}>{sampleAmount(sample.currency, sample.amount, sample.isFree)}</TableCell>
                <TableCell className={CELL}>
                  <StatusBadge label={status.label} tone={status.tone} />
                </TableCell>
                <TableCell className={`${CELL} whitespace-nowrap`}>{sampleDay(sample.paidAt)}</TableCell>
                <TableCell className={`${CELL} whitespace-nowrap`}>{sampleDay(sample.inventoryAt)}</TableCell>
              </TableRow>
            )
          })
        )}
      </TableBody>
    </Table>
  </div>
)
