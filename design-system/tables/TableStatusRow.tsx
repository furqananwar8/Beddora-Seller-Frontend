import React from 'react'
import { Spinner } from '@/design-system/loaders'
import { cn } from '@/utils/cn'
import { TableCell, TableRow } from './Table'

/**
 * Put on a table's scroll container so a TableStatusRow centres in the part of the table that is in view: the
 * container becomes the size its row measures against (`cqi`), however wide the columns make the table.
 */
export const TABLE_STATUS_VIEWPORT = '[container-type:inline-size]'

const TONE = { muted: 'text-text-muted', danger: 'text-danger-600' } as const

interface TableStatusRowProps {
  colSpan: number
  /** Shows the spinner instead of a message. */
  loading?: boolean
  tone?: keyof typeof TONE
  children?: React.ReactNode
}

/** A loading, error or empty state across the whole table, centred both ways in the visible area. */
export const TableStatusRow: React.FC<TableStatusRowProps> = ({ colSpan, loading, tone = 'muted', children }) => (
  <TableRow>
    <TableCell colSpan={colSpan} className="p-0">
      {/* Sticky and as wide as the scroll container, so it stays centred while the table scrolls sideways */}
      <div className={cn('sticky left-0 flex min-h-[16rem] w-full max-w-[100cqi] items-center justify-center px-4 text-center text-sm', TONE[tone])}>
        {loading ? <Spinner /> : children}
      </div>
    </TableCell>
  </TableRow>
)
