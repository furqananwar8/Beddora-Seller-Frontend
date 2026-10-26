'use client'

import React from 'react'
import { cn } from '@/utils/cn'

/**
 * Table component - Pure UI component with sticky header support
 */

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  /** Classes for the wrapper around the table, e.g. `overflow-visible` when a parent already scrolls it. */
  wrapperClassName?: string
}

export const Table: React.FC<TableProps> = ({ className, wrapperClassName, ...props }) => {
  return (
    <div className={cn('ds-table-wrap ds-scroll-x bg-transparent p-0 m-0 border-none', wrapperClassName)}>
      <table className={cn('ds-table border-separate border-spacing-0 min-w-full', className)} {...props} />
    </div>
  )
}

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  ...props
}) => {
  return (
    <thead className={cn('ds-table-head sticky top-0 z-30 bg-surface', className)} {...props} />
  )
}

/** Totals pinned under the rows while the body scrolls. */
export const TableFooter: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  ...props
}) => {
  return (
    <tfoot className={cn('sticky bottom-0 z-20 bg-surface font-semibold', className)} {...props} />
  )
}

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  ...props
}) => {
  return (
    <tbody className={cn('ds-table-body', className)} {...props} />
  )
}

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className,
  ...props
}) => {
  return (
    <tr
      className={cn('ds-table-row', className)}
      {...props}
    />
  )
}

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  ...props
}) => {
  return (
    <th
      className={cn(
        'ds-table-th sticky top-0 z-30 bg-surface px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wider text-text-muted leading-tight border-b border-border',
        className
      )}
      {...props}
    />
  )
}

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className,
  ...props
}) => {
  return (
    <td
      className={cn('ds-table-td px-4 py-3 align-middle text-sm border-b border-border/50', className)}
      {...props}
    />
  )
}