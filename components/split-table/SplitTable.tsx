'use client'

import React, { useMemo, useRef, useCallback, useEffect } from 'react'
import { TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/design-system/tables'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { TableSkeleton } from '@/design-system/loaders'
import { cn } from '@/utils/cn'

export type SortDirection = 'asc' | 'desc'

export interface ColumnDef<T = any> {
  key: string
  header: React.ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  sortKey?: string
  heatmap?: 'green' | 'red' | 'neutral'
  headerClassName?: string
  cellClassName?: string
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
  isLoading?: boolean
  skeletonRows?: number
  emptyMessage?: string
  emptyState?: React.ReactNode
  pagination?: PaginationConfig
  sortColumn?: string
  sortDirection?: SortDirection
  onSort?: (sortKey: string) => void
  headerClassName?: string
  bodyClassName?: string
  pendingRowKeys?: Set<string>
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
    meta: { isPending: boolean }
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
    emptyState,
    pagination,
    sortColumn,
    sortDirection,
    onSort,
    headerClassName = '',
    bodyClassName = '',
    pendingRowKeys,
  } = props

  /* ── scroll sync refs ── */
  const headerRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  /* ── body drives header ── */
  const handleBodyScroll = useCallback(() => {
    if (headerRef.current && bodyRef.current) {
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft
    }
  }, [])

  /* ── re-sync when data changes ── */
  useEffect(() => {
    handleBodyScroll()
  }, [data, handleBodyScroll])

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

  /* ── heatmap ranges (generic mode only) ── */
  const heatmapRanges = useMemo(() => {
    if (isSimpleMode) return {} as Record<string, number[]>
    const ranges: Record<string, number[]> = {}
    for (const col of columns) {
      if (col.heatmap && col.heatmap !== 'neutral') {
        const values: number[] = []
        for (const row of data as T[]) {
          const val = (row as any)[col.key]
          if (typeof val === 'number' && !isNaN(val)) {
            values.push(val)
          }
        }
        ranges[col.key] = values
      }
    }
    return ranges
  }, [data, columns, isSimpleMode])

  const getHeatmapBg = (
    val: number,
    range: number[] | undefined,
    type: 'green' | 'red' | 'neutral'
  ): string | undefined => {
    if (type === 'neutral' || !range || range.length === 0) return undefined
    const min = Math.min(...range)
    const max = Math.max(...range)
    if (min === max) return undefined
    const ratio = (val - min) / (max - min)
    if (type === 'green') {
      return `rgba(34, 197, 94, ${0.08 + ratio * 0.22})`
    }
    if (type === 'red') {
      return `rgba(239, 68, 68, ${0.08 + (1 - ratio) * 0.22})`
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
          {/* ═══════════════════════════════════════════════════════════════
              HEADER — overflow: hidden. NO ds-table-wrap here.
              Uses raw <table> instead of <Table> to avoid the inner
              overflow-x-auto wrapper that Table.tsx injects.
              ═══════════════════════════════════════════════════════════════ */}
          <div
            ref={headerRef}
            className={cn(
              'h-[50px] shrink-0 bg-surface border-b border-border z-20 overflow-hidden',
              headerClassName
            )}
          >
            <table className="h-full min-w-full table-fixed ds-table">
              <TableHeader>
                <TableRow className="h-full bg-surface shadow-sm items-center">
                  {columns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        'h-full text-sm font-semibold text-text-primary',
                        col.width,
                        alignClass(col),
                        col.headerClassName,
                        col.sortable && 'cursor-pointer hover:bg-surface-secondary'
                      )}
                      onClick={() => handleSortClick(col)}
                    >
                      <div className="flex items-center h-full">
                        {col.header}
                        {sortIndicator(col)}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
            </table>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              BODY — overflow-auto = the ONLY scrollbar.
              Same raw <table> approach. onScroll syncs header scrollLeft.
              ═══════════════════════════════════════════════════════════════ */}
          <div
            ref={bodyRef}
            className={cn('overflow-auto flex-1 min-h-0', bodyClassName)}
            onScroll={handleBodyScroll}
          >
            <table className="min-w-full table-fixed ds-table">
              <TableBody>
                {data.length > 0 ? (
                  (data as any[]).map((row, rowIndex) => {
                    const rowKeyValue = getRowKey(row, rowIndex)
                    const isPending = pendingRowKeys ? pendingRowKeys.has(rowKeyValue) : false

                    return (
                      <TableRow
                        key={rowKeyValue}
                        aria-busy={isPending}
                        className={cn(
                          'hover:bg-surface-secondary',
                          isPending && 'opacity-60'
                        )}
                      >
                        {columns.map((col) => {
                          const heatmapBg = (() => {
                            if (isSimpleMode || !col.heatmap || col.heatmap === 'neutral')
                              return undefined
                            const val = (row as any)[col.key]
                            if (typeof val !== 'number') return undefined
                            return getHeatmapBg(val, heatmapRanges[col.key], col.heatmap)
                          })()

                          return (
                            <TableCell
                              key={col.key}
                              className={cn(
                                col.width,
                                alignClass(col),
                                col.cellClassName
                              )}
                              style={heatmapBg ? { backgroundColor: heatmapBg } : undefined}
                            >
                              {renderCellContent(row, col, rowIndex, isPending)}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="text-center text-text-muted py-8"
                    >
                      {emptyState || emptyMessage}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </table>
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