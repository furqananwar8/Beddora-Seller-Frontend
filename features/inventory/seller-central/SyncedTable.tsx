"use client"

import React from 'react'
import { useFitToViewport } from '@/hooks/useFitToViewport'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { Spinner } from '@/design-system/loaders'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { cn } from '@/utils/cn'

const HEAD = 'text-center align-middle'
export const CELL = 'text-center align-middle'

export interface SyncedColumn<T> {
  label: string
  /** Width and any extra cell classes (alignment is shared). */
  className?: string
  render: (row: T) => React.ReactNode
}

interface PageInfo {
  page: number
  limit: number
  totalRecords: number
  totalPages: number
}

interface Props<T> {
  columns: SyncedColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  /** Shown when there are no rows and the user hasn't filtered. */
  emptyMessage: string
  filtered: boolean
  pageInfo?: PageInfo
  itemLabel: string
  onPageChange: (page: number) => void
}

/**
 * The framed, sticky-header table every Seller Central platform list uses. A platform supplies its own
 * columns (Amazon plans and Walmart shipments don't share a structure); loading, empty, error and paging are shared.
 */
export function SyncedTable<T>({ columns, rows, rowKey, isLoading, isFetching, isError, emptyMessage, filtered, pageInfo, itemLabel, onPageChange }: Props<T>) {
  const fit = useFitToViewport<HTMLDivElement>()
  return (
    <div className={cn('overflow-hidden rounded-lg border border-border shadow-sm', isFetching && 'opacity-70 transition-opacity')}>
      <div ref={fit.ref} style={fit.style} className="max-h-[calc(100vh-380px)] overflow-auto">
        <Table className="min-w-full" wrapperClassName="overflow-visible">
          <TableHeader className="sticky top-0 z-10 bg-surface shadow-sm">
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.label} className={cn(HEAD, c.className)}>
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <div className="flex justify-center py-12">
                    <Spinner />
                  </div>
                </TableCell>
              </TableRow>
            ) : isError || rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <div className={cn('py-12 text-center', isError ? 'font-medium text-danger-600' : 'text-text-muted')}>
                    {isError ? 'Could not load shipments.' : filtered ? 'No shipments match your filters.' : emptyMessage}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={rowKey(row)}>
                  {columns.map((c) => (
                    <TableCell key={c.label} className={cn(CELL, c.className)}>
                      {c.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {pageInfo && (
        <PaginationFooter
          page={pageInfo.page}
          pageSize={pageInfo.limit}
          totalItems={pageInfo.totalRecords}
          totalPages={pageInfo.totalPages}
          onPageChange={onPageChange}
          itemLabel={itemLabel}
        />
      )}
    </div>
  )
}
