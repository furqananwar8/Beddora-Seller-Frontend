'use client'

import React from 'react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/design-system/tables'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { TableSkeleton } from '@/design-system/loaders'

export type SortDirection = 'asc' | 'desc'

export interface ColumnDef<T = any> {
  key: string
  header: React.ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  sortKey?: string
}

export interface PaginationConfig {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  onPageChange: (page: number) => void
  itemLabel?: string
}

/* ────────────────────────────────────────────────────────────────
   Base props
   ──────────────────────────────────────────────────────────────── */
interface BaseProps {
  columns: ColumnDef[]
  wrapperClassName?: string
  isLoading?: boolean        // STRICT: initial / full-table refetch ONLY
  skeletonRows?: number
  emptyMessage?: string
  pagination?: PaginationConfig
  sortColumn?: string
  sortDirection?: SortDirection
  onSort?: (sortKey: string) => void
  headerClassName?: string
  bodyClassName?: string
  pendingRowKeys?: Set<string> // NEW: which rows are currently mutating
}

/* ────────────────────────────────────────────────────────────────
   Mode A – Generic rows + renderCell
   ──────────────────────────────────────────────────────────────── */
export interface GenericProps<T> extends BaseProps {
  data: T[]
  rowKey: keyof T | ((row: T) => string)
  renderCell: (
    row: T,
    column: ColumnDef<T>,
    rowIndex: number,
    meta: { isPending: boolean } // NEW
  ) => React.ReactNode
}

/* ────────────────────────────────────────────────────────────────
   Mode B – Simple 2D array
   ──────────────────────────────────────────────────────────────── */
export interface SimpleProps extends BaseProps {
  data: any[][]
  rowKey?: never
  renderCell?: never
}

/* ────────────────────────────────────────────────────────────────
   Overloads
   ──────────────────────────────────────────────────────────────── */
export function SplitTable<T>(props: GenericProps<T>): React.ReactElement
export function SplitTable(props: SimpleProps): React.ReactElement
export function SplitTable<T = any>(props: GenericProps<T> | SimpleProps): React.ReactElement {
  const {
    columns,
    data,
    wrapperClassName = '',
    isLoading = false,
    skeletonRows = 10,
    emptyMessage = 'No data found',
    pagination,
    sortColumn,
    sortDirection,
    onSort,
    headerClassName = '',
    bodyClassName = '',
    pendingRowKeys,
  } = props

  /* ── runtime validations ── */
  if (!Array.isArray(columns) || columns.length === 0) {
    throw new Error('[SplitTable] "columns" must be a non-empty array')
  }

  const keys = columns.map((c) => c.key)
  const uniqueKeys = new Set(keys)
  if (uniqueKeys.size !== keys.length) {
    throw new Error(
      `[SplitTable] Duplicate column keys: ${keys
        .filter((k, i) => keys.indexOf(k) !== i)
        .join(', ')}`
    )
  }

  if (!Array.isArray(data)) {
    throw new Error('[SplitTable] "data" must be an array')
  }

  const isSimpleMode = !('renderCell' in props) || props.renderCell === undefined

  if (isSimpleMode) {
    const simpleData = data as any[][]
    const badRow = simpleData.findIndex((row, idx) => {
      if (!Array.isArray(row)) {
        throw new Error(
          `[SplitTable] data[${idx}] is not an array. In simple mode each row must be an array.`
        )
      }
      return row.length !== columns.length
    })
    if (badRow !== -1) {
      throw new Error(
        `[SplitTable] Column/data count mismatch at row ${badRow}: ` +
          `expected ${columns.length} cells, got ${simpleData[badRow].length}`
      )
    }
  }

  /* ── helpers ── */
  const getRowKey = (row: T | any[], index: number): string => {
    if (isSimpleMode) return `row-${index}`
    const generic = props as GenericProps<T>
    if (typeof generic.rowKey === 'function') return generic.rowKey(row as T)
    const val = (row as any)[generic.rowKey]
    if (val == null) {
      throw new Error(
        `[SplitTable] rowKey "${String(generic.rowKey)}" is undefined for row ${index}`
      )
    }
    return String(val)
  }

  const renderCellContent = (
    row: T | any[],
    column: ColumnDef,
    rowIndex: number,
    isPending: boolean
  ): React.ReactNode => {
    if (isSimpleMode) {
      const colIndex = columns.indexOf(column)
      return (row as any[])[colIndex]
    }
    const generic = props as GenericProps<T>
    return generic.renderCell(row as T, column as ColumnDef<T>, rowIndex, { isPending })
  }

  const handleSortClick = (column: ColumnDef) => {
    if (!column.sortable || !column.sortKey || !onSort) return
    onSort(column.sortKey)
  }

  const sortIndicator = (column: ColumnDef) => {
    if (!column.sortable || !column.sortKey || sortColumn !== column.sortKey) return null
    return sortDirection === 'asc' ? ' ↑' : ' ↓'
  }

  const alignClass = (col: ColumnDef) => {
    if (col.align === 'center') return 'text-center'
    if (col.align === 'right') return 'text-right'
    return 'text-left'
  }

  return (
    <div className={`flex flex-col min-h-0 ${wrapperClassName}`}>
      {isLoading ? (
        <div className="p-6">
          <TableSkeleton rows={skeletonRows} columns={columns.length} />
        </div>
      ) : (
        <>
          {/* Header – fixed, never scrolls */}
          <div className={`flex flex-col justify-center align-between h-[50px] shrink-0 bg-surface border-b border-border z-20 ${headerClassName}`}>
            <Table className="h-full w-full table-fixed">
              <TableHeader>
                <TableRow className="h-full bg-surface shadow-sm">
                  {columns.map((col) => (
                <TableHead
                    key={col.key}
                    className={`h-full py-4 text-sm font-semibold text-text-primary ${col.width || ''} ${alignClass(col)} ${
                    col.sortable ? 'cursor-pointer hover:bg-surface-secondary' : ''
                    }`}
                    onClick={() => handleSortClick(col)}
                >
                    {col.header}
                    {sortIndicator(col)}
                </TableHead>
                ))}
                </TableRow>
              </TableHeader>
            </Table>
          </div>

          {/* Body – scrollable, rows NEVER unmount on mutation */}
          <div className={`overflow-auto flex-1 min-h-0 ${bodyClassName}`}>
            <Table className="w-full table-fixed">
              <TableBody>
                {data.length > 0 ? (
                  (data as any[]).map((row, rowIndex) => {
                    const rowKeyValue = getRowKey(row, rowIndex)
                    const isPending = pendingRowKeys ? pendingRowKeys.has(rowKeyValue) : false

                    return (
                      <TableRow
                        key={rowKeyValue}
                        aria-busy={isPending}
                        className={`hover:bg-surface-secondary ${
                          isPending ? 'opacity-60' : ''
                        }`}
                      >
                        {columns.map((col) => (
                          <TableCell
                            key={col.key}
                            className={`${col.width || ''} ${alignClass(col)}`}
                          >
                            {renderCellContent(row, col, rowIndex, isPending)}
                          </TableCell>
                        ))}
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="text-center text-text-muted py-8"
                    >
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalItems > 0 && (
            <div className="shrink-0 border-t border-border">
              <PaginationFooter
                page={pagination.page}
                pageSize={pagination.pageSize}
                totalItems={pagination.totalItems}
                totalPages={pagination.totalPages}
                onPageChange={pagination.onPageChange}
                itemLabel={pagination.itemLabel || 'items'}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}