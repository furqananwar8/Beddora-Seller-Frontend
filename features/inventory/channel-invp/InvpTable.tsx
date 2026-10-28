'use client'

import React from 'react'
import { CountryFlag } from '@/components/flags/CountryFlag'
import { Spinner } from '@/design-system/loaders'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import type { InvpChannel, InvpCell, InvpLine, InvpMarketplaceRow, InvpPeriod, InvpReport, InvpRow } from '@/services/api/channelInvp.api'
import { cn } from '@/utils/cn'
import { LEVEL_META, LEVELS, lineLabel, LINES, MARKETPLACE_META } from './invpFilters'

const NUM = 'whitespace-nowrap text-right align-middle tabular-nums'
const PERIOD = 'min-w-[7.5rem]'
/** The SKU column stays in view while the periods scroll sideways (globals.css layers sticky cells). */
const STICKY = 'sticky left-0 bg-surface'

export interface InvpTarget {
  row: InvpRow
  marketplace: InvpMarketplaceRow
  line: InvpLine
  /** null: the whole range (a line's label was clicked). */
  period: InvpPeriod | null
}

const format = (cell: InvpCell, currency: string, amount: boolean) =>
  amount ? (
    <span className="inline-flex items-baseline gap-1">
      <span className="font-semibold opacity-70">{currency}</span>
      {cell.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  ) : (
    cell.value.toLocaleString()
  )

interface InvpTableProps {
  report: InvpReport | undefined
  channel: InvpChannel
  isLoading: boolean
  isError: boolean
  onOpen: (target: InvpTarget) => void
}

/**
 * Internal SKUs down the side, one block per marketplace under each, three lines in every block (our warehouse,
 * containers on their way, the channel), and the stock at the end of each period across, coloured by days of cover.
 */
export const InvpTable: React.FC<InvpTableProps> = ({ report, channel, isLoading, isError, onOpen }) => {
  const periods = report?.periods ?? []
  const amount = report?.view === 'amount'
  const columns = periods.length + 3

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border shadow-sm">
        {/* At most a screen tall: the header, the SKU column and the page stay in view however it is scrolled */}
        <div className="max-h-[calc(100vh-7rem)] overflow-auto">
          <Table className="min-w-full" wrapperClassName="overflow-visible">
            <TableHeader className="sticky top-0 z-30 bg-surface shadow-sm">
              <TableRow>
                {/* sticky-corner (globals.css) lifts it above the other header cells, which slide under it */}
                <TableHead className={cn(STICKY, 'sticky-corner min-w-[14rem]')}>SKU</TableHead>
                <TableHead className="min-w-[12rem]">Stock</TableHead>
                <TableHead className="min-w-[7rem] text-right">Daily sales</TableHead>
                {periods.map((period) => (
                  <TableHead key={period.key} className={cn(PERIOD, 'whitespace-nowrap text-right')}>
                    {period.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns} className="py-10 text-center">
                    <Spinner />
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={columns} className="py-10 text-center text-danger-600">Could not load the channel inventory.</TableCell>
                </TableRow>
              ) : !report || report.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns} className="py-10 text-center text-text-muted">No SKU is mapped to this channel in the marketplaces picked.</TableCell>
                </TableRow>
              ) : (
                report.data.flatMap((row) =>
                  row.marketplaces.flatMap((marketplace, mIndex) =>
                    LINES.map((line, lIndex) => {
                      const firstOfSku = mIndex === 0 && lIndex === 0
                      const firstOfMarketplace = lIndex === 0
                      const cells = marketplace.lines[line]
                      return (
                        <TableRow key={`${row.product.id}:${marketplace.marketplace}:${line}`} className={cn(firstOfMarketplace && mIndex > 0 && 'border-t border-border', firstOfSku && 'border-t-2 border-border')}>
                          {firstOfSku && (
                            <TableCell rowSpan={row.marketplaces.length * LINES.length} className={cn(STICKY, 'align-top')}>
                              <div className="font-semibold text-text-primary">{row.product.sku}</div>
                              <div className="text-xs text-text-muted">{row.product.name}</div>
                            </TableCell>
                          )}
                          <TableCell className="whitespace-nowrap">
                            {firstOfMarketplace && (
                              <div className="mb-1 max-w-[12rem] text-xs" title={marketplace.channelSkus.map((entry) => entry.sku).join(', ')}>
                                <div className="flex items-center gap-1.5 font-semibold text-text-secondary">
                                  <CountryFlag code={marketplace.marketplace} />
                                  {MARKETPLACE_META[marketplace.marketplace].label}
                                </div>
                                {/* Long channel SKUs are cut short; the full list is in the tooltip */}
                                <div className="truncate text-text-muted">{marketplace.channelSkus.map((entry) => entry.sku).join(', ')}</div>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => onOpen({ row, marketplace, line, period: null })}
                              className={cn('text-sm font-medium text-primary-600 hover:underline', line === 'warehouse' && 'after:ml-1 after:text-xs after:font-normal after:text-text-muted after:content-["(shared)"]')}
                            >
                              {lineLabel(line, channel)}
                            </button>
                          </TableCell>
                          {firstOfMarketplace && (
                            <TableCell rowSpan={LINES.length} className={cn(NUM, 'font-semibold')}>
                              {marketplace.dailySales.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </TableCell>
                          )}
                          {periods.map((period) => {
                            const cell = cells[period.key]
                            return (
                              <TableCell key={period.key} className={NUM}>
                                {cell ? (
                                  <button
                                    type="button"
                                    onClick={() => onOpen({ row, marketplace, line, period })}
                                    title={`${cell.units.toLocaleString()} units${cell.level ? ` · ${LEVEL_META[cell.level].label}` : ''}`}
                                    className={cn('rounded-md px-2 py-1 font-medium hover:underline', cell.level && LEVEL_META[cell.level].cell)}
                                  >
                                    {format(cell, marketplace.currency, amount)}
                                  </button>
                                ) : (
                                  <span className="text-text-muted">—</span>
                                )}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      )
                    })
                  )
                )
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        {LEVELS.map((level) => (
          <li key={level} className="flex items-center gap-2" title={report ? `Days of cover: under ${report.thresholds.low} low, over ${report.thresholds.high} much` : undefined}>
            <span aria-hidden className={cn('h-4 w-4 shrink-0 rounded border', LEVEL_META[level].swatch)} />
            <span className="font-medium text-text-primary">{LEVEL_META[level].label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
