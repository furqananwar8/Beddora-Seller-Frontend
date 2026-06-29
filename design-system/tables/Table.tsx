'use client'

import React from 'react'
import { cn } from '@/utils/cn'

/**
 * Table component - Pure UI component
 * 
 * Usage:
 * <Table>
 *   <TableHeader>
 *     <TableRow>
 *       <TableHead>Name</TableHead>
 *       <TableHead>Email</TableHead>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     <TableRow>
 *       <TableCell>John Doe</TableCell>
 *       <TableCell>john@example.com</TableCell>
 *     </TableRow>
 *   </TableBody>
 * </Table>
 */

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {}

export const Table: React.FC<TableProps> = ({ className, ...props }) => {
  return (
    <div className="ds-table-wrap">
      <table className={cn('ds-table', className)} {...props} />
    </div>
  )
}

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className,
  ...props
}) => {
  return (
    <thead className={cn('ds-table-head', className)} {...props} />
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
      className={cn('ds-table-th', className)}
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
      className={cn('ds-table-td', className)}
      {...props}
    />
  )
}

