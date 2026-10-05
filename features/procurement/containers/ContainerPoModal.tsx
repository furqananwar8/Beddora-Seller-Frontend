'use client'

import React from 'react'
import Link from 'next/link'
import { Modal } from '@/design-system/modals'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import type { ContainerItem, ContainerLine } from '@/services/api/procurement.api'
import { cn } from '@/utils/cn'

const CELL = 'text-center align-middle'
const qty = (value: number) => value.toLocaleString('en-CA')

/** "Show purchase order": per PO, each SKU's ordered units against the units in this container. */
export const ContainerPoModal: React.FC<{ container: ContainerItem | null; onClose: () => void }> = ({ container, onClose }) => {
  const groups = new Map<number, ContainerLine[]>()
  for (const line of container?.lines ?? []) groups.set(line.purchaseOrderId, [...(groups.get(line.purchaseOrderId) ?? []), line])

  return (
    <Modal isOpen={container !== null} onClose={onClose} title={`Ordered vs. in ${container?.containerNo ?? 'container'}`} size="md" closeOnEscape>
      {container && (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table className="min-w-full">
            <TableHeader className="bg-secondary-50">
              <TableRow>
                <TableHead className="text-left">PO / SKU</TableHead>
                <TableHead className={CELL}>Ordered</TableHead>
                <TableHead className={CELL}>Here</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...groups.entries()].map(([purchaseOrderId, lines]) => (
                <React.Fragment key={purchaseOrderId}>
                  <TableRow className="bg-secondary-50/60">
                    <TableCell colSpan={3} className="text-sm">
                      <Link href={`/dashboard/procurement/purchase-orders/${purchaseOrderId}`} className="font-mono font-semibold text-primary-600 underline-offset-2 hover:underline">
                        {lines[0].poNo}
                      </Link>
                      <span className="text-text-muted"> · {container.packagingList?.supplier.name}</span>
                    </TableCell>
                  </TableRow>
                  {lines.map((line) => (
                    <TableRow key={`${purchaseOrderId}:${line.sku}`}>
                      <TableCell>
                        <div className="font-mono text-sm font-semibold text-text-primary">{line.sku}</div>
                        <div className="text-xs text-text-muted">{line.name}</div>
                      </TableCell>
                      <TableCell className={cn(CELL, 'tabular-nums')}>{qty(line.ordered)}</TableCell>
                      <TableCell className={cn(CELL, 'font-semibold tabular-nums')}>{qty(line.units)}</TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Modal>
  )
}
