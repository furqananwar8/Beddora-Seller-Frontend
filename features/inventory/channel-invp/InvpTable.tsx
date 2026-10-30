'use client'

import React from 'react'
import { format, parseISO } from 'date-fns'
import { Boxes, CalendarDays, Container, Store, Truck, type LucideIcon, Warehouse } from 'lucide-react'
import { Table, TABLE_STATUS_VIEWPORT, TableBody, TableCell, TableHead, TableHeader, TableRow, TableStatusRow } from '@/design-system/tables'
import type { InvpProjectionCell, InvpReport, InvpRow } from '@/services/api/channelInvp.api'
import { cn } from '@/utils/cn'
import { LEVEL_META, LEVELS } from './invpFilters'

const WEEK = 'min-w-[8.5rem] align-top'
/** The SKU column stays in view while the weeks scroll sideways (globals.css layers sticky cells). */
const STICKY = 'sticky left-0 bg-surface'

const units = (value: number) => value.toLocaleString()
const rate = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 })

/** Where a label and its figure sit on their line: apart at both ends, or together on the left or the right. */
const ALIGN = { spread: 'justify-between gap-3', left: 'justify-start gap-1.5', right: 'justify-end gap-1.5' } as const

/** A label and its figure on one line. */
const Figure: React.FC<{ label: React.ReactNode; value: React.ReactNode; title?: string; strong?: boolean; align?: keyof typeof ALIGN }> = ({ label, value, title, strong, align = 'spread' }) => (
  <div className={cn('flex items-center whitespace-nowrap', ALIGN[align])} title={title}>
    <span className="text-xs opacity-70">{label}</span>
    <span className={cn('tabular-nums', strong && 'font-semibold')}>{value}</span>
  </div>
)

/** A live stock count after its icon; what it counts is the tooltip. */
const StockFigure: React.FC<{ icon: LucideIcon; title: string; value: number }> = ({ icon: Icon, title, value }) => (
  <span className="inline-flex items-center gap-1 whitespace-nowrap" title={title} aria-label={`${title}: ${units(value)}`}>
    <Icon className="h-3.5 w-3.5 text-text-muted" aria-hidden />
    <span className="tabular-nums">{units(value)}</span>
  </span>
)

/** One projected day: total inventory, what entered transit, and how many days it lasts; coloured as a whole. */
const ProjectionCellView: React.FC<{ cell: InvpProjectionCell | undefined }> = ({ cell }) => {
  if (!cell) return <TableCell className={WEEK}>—</TableCell>
  const meta = LEVEL_META[cell.level]
  return (
    <TableCell className={cn(WEEK, 'space-y-0.5 border-l border-border', meta.cell)} title={meta.label}>
      <Figure label={<Boxes className="h-3.5 w-3.5" aria-label="Total inventory" />} value={units(cell.totalInventory)} title="Total inventory" strong align="right" />
      <Figure label={<Container className="h-3.5 w-3.5" aria-label="In transit" />} value={units(cell.inTransit)} title="In transit: container units that set off this week" align="right" />
      <Figure label={<CalendarDays className="h-3.5 w-3.5" aria-label="Days" />} value={<span className="text-[11px]">{cell.daysOfCover === null ? '∞' : cell.daysOfCover}</span>} title="Days this stock lasts at the daily sale" strong align="left" />
    </TableCell>
  )
}

interface InvpTableProps {
  report: InvpReport | undefined
  isLoading: boolean
  isError: boolean
}

/**
 * Internal SKUs down the side with their live stock and sales rates, then the stock projected from today week by
 * week across, each cell coloured by how long the stock lasts against the 30-day clearance target.
 */
export const InvpTable: React.FC<InvpTableProps> = ({ report, isLoading, isError }) => {
  const weeks = report?.weeks ?? []
  const columns = weeks.length + 2

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border shadow-sm">
        {/* At most a screen tall: the header, the SKU column and the page stay in view however it is scrolled */}
        <div className={cn('max-h-[calc(100vh-7rem)] overflow-auto', TABLE_STATUS_VIEWPORT)}>
          <Table className="min-w-full" wrapperClassName="overflow-visible">
            <TableHeader className="sticky top-0 z-30 bg-surface shadow-sm">
              <TableRow>
                {/* sticky-corner (globals.css) lifts it above the other header cells, which slide under it */}
                <TableHead className={cn(STICKY, 'sticky-corner min-w-[15rem]')}>SKU</TableHead>
                <TableHead className="min-w-[11rem]">Daily sales</TableHead>
                {weeks.map((week, index) => (
                  <TableHead key={week} className={cn(WEEK, 'whitespace-nowrap text-right')}>
                    <div>{format(parseISO(week), 'dd MMM')}</div>
                    <div className="text-xs font-normal text-text-muted">{index === 0 ? 'Today' : `Week ${index}`}</div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableStatusRow colSpan={columns} loading />
              ) : isError ? (
                <TableStatusRow colSpan={columns} tone="danger">Could not load the channel inventory.</TableStatusRow>
              ) : !report || report.data.length === 0 ? (
                <TableStatusRow colSpan={columns}>No SKU is mapped to the channels and marketplaces picked.</TableStatusRow>
              ) : (
                report.data.map((row: InvpRow) => (
                  <TableRow key={row.product.id} className="border-t-2 border-border">
                    <TableCell className={cn(STICKY, 'align-top')}>
                      <div className="font-semibold text-text-primary">{row.product.sku}</div>
                      <div className="truncate text-xs text-text-muted" title={row.asins.join(', ')}>
                        {row.asins.length ? row.asins.join(', ') : 'No ASIN'}
                      </div>
                      <div className="mt-1.5 flex items-center gap-3 text-sm">
                        <StockFigure icon={Warehouse} title="Warehouse: available in our warehouse now" value={row.stock.warehouse} />
                        <StockFigure icon={Store} title="Platform: available at the channels picked now" value={row.stock.platform} />
                        <StockFigure icon={Truck} title="Shipping: on FBA / WFS shipments in transit" value={row.stock.shipping} />
                      </div>
                    </TableCell>
                    <TableCell className="space-y-0.5 align-top text-sm">
                      <Figure label="Daily sale" value={rate(row.sales.daily)} title="Units a day over the last 30 days" strong />
                      <Figure label="Potential" value={rate(row.sales.potential)} title="Units sold ÷ days in stock" />
                      <Figure label="Projected" value={rate(row.sales.projected)} title="Potential sale × (1 + growth rate)" />
                    </TableCell>
                    {weeks.map((week, index) => (
                      <ProjectionCellView key={week} cell={row.projection[index]} />
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        {LEVELS.map((level) => (
          <li key={level} className="flex items-center gap-2" title={report ? LEVEL_META[level].rule(report.thresholds) : undefined}>
            <span aria-hidden className={cn('h-4 w-4 shrink-0 rounded border', LEVEL_META[level].swatch)} />
            <span className="font-medium text-text-primary">{LEVEL_META[level].label}</span>
            {report && <span className="text-text-muted">({LEVEL_META[level].rule(report.thresholds)})</span>}
          </li>
        ))}
        <li className="flex items-center gap-1.5 text-text-muted">
          <Container className="h-4 w-4" aria-hidden /> In transit: container units that set off that week
        </li>
      </ul>
    </div>
  )
}
