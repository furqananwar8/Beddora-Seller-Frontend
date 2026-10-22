'use client'

import React from 'react'
import { MarketplaceFlag } from '@/components/marketplace-flag/MarketPlaceFlag'
import { Badge, type BadgeProps } from '@/design-system/badges'
import { Spinner } from '@/design-system/loaders'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { Tooltip } from '@/design-system/tooltips'
import { cn } from '@/utils/cn'
import type { ChannelStockOption, ChannelStockRow } from '@/services/api/channelStock.api'

const HEAD = 'text-center align-middle'
const CELL = 'text-center align-middle'
const COLUMNS = 7

/** Channel-fulfilled stock (FBA, WFS) vs stock the seller ships. */
const FULFILLMENT_VARIANT: Record<string, BadgeProps['variant']> = { FBA: 'secondary', WFS: 'secondary', SELLER: 'success' }

/** A figure the channel doesn't report shows as a dash. */
const Figure: React.FC<{ value: number | null }> = ({ value }) =>
  value === null ? <span className="text-text-muted">–</span> : <>{value.toLocaleString()}</>

interface ChannelStockTableProps {
  rows: ChannelStockRow[]
  fulfillments: ChannelStockOption[]
  /** Label of the row's reference, e.g. `ASIN`. */
  referenceLabel?: string
  isLoading: boolean
  isError: boolean
}

export const ChannelStockTable: React.FC<ChannelStockTableProps> = ({ rows, fulfillments, referenceLabel, isLoading, isError }) => {
  const fulfillmentName = (id: string) => fulfillments.find((option) => option.id === id)?.name ?? id

  const message = (content: React.ReactNode) => (
    <TableRow>
      <TableCell colSpan={COLUMNS}>{content}</TableCell>
    </TableRow>
  )

  return (
    <Table className="min-w-full">
      <TableHeader className="sticky top-0 z-10 bg-surface shadow-sm">
        <TableRow>
          <TableHead className={cn(HEAD, 'min-w-[260px] text-left')}>Product</TableHead>
          <TableHead className={HEAD}>Fulfillment</TableHead>
          <TableHead className={HEAD}>Available</TableHead>
          <TableHead className={HEAD}>Reserved</TableHead>
          <TableHead className={HEAD}>Inbound</TableHead>
          <TableHead className={HEAD}>Unsellable</TableHead>
          <TableHead className={HEAD}>On hand</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading
          ? message(
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            )
          : isError
            ? message(<div className="py-12 text-center font-medium text-danger-600">Couldn&apos;t load channel inventory.</div>)
            : rows.length === 0
              ? message(
                  <div className="py-12 text-center">
                    <div className="font-medium text-text-primary">No SKUs match these filters</div>
                    <div className="text-sm text-text-muted">Change the search or the filters and apply them again.</div>
                  </div>
                )
              : rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="align-middle">
                      <div className="flex items-center gap-3">
                        <span title={row.marketplace}>
                          <MarketplaceFlag marketplace={row.marketplace} />
                        </span>
                        <Tooltip content={row.productName ?? 'No product name synced yet'} side="bottom" align="start" multiline className="min-w-0">
                          <div className="min-w-0 cursor-default">
                            <div className="truncate font-mono text-sm font-medium text-text-primary">{row.sku}</div>
                            {row.reference && (
                              <div className="truncate text-xs text-text-muted">
                                {referenceLabel && <span className="font-medium">{referenceLabel}: </span>}
                                <span className="font-mono">{row.reference}</span>
                              </div>
                            )}
                          </div>
                        </Tooltip>
                      </div>
                    </TableCell>
                    <TableCell className={CELL}>
                      <Badge size="sm" variant={FULFILLMENT_VARIANT[row.fulfillment] ?? 'secondary'} className="uppercase">
                        {fulfillmentName(row.fulfillment)}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn(CELL, 'font-medium', row.available === 0 && 'text-danger-600')}>{row.available.toLocaleString()}</TableCell>
                    <TableCell className={CELL}><Figure value={row.reserved} /></TableCell>
                    <TableCell className={CELL}><Figure value={row.inbound} /></TableCell>
                    <TableCell className={CELL}><Figure value={row.unsellable} /></TableCell>
                    <TableCell className={CELL}><Figure value={row.onHand} /></TableCell>
                  </TableRow>
                ))}
      </TableBody>
    </Table>
  )
}
