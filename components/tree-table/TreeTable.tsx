'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Spinner } from '@/design-system/loaders'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { cn } from '@/utils/cn'

export interface TreeColumn<T> {
  key: string
  header: React.ReactNode
  /** Extra classes for the header and every cell of this column (widths, alignment overrides). */
  className?: string
  render: (row: T, context: { isChild: boolean; parent?: T }) => React.ReactNode
}

interface TreeTableProps<T> {
  columns: TreeColumn<T>[]
  rows: T[]
  getKey: (row: T) => string | number
  getChildren: (row: T) => T[]
  /** Rows that open on their own, e.g. a parent whose child matched the search. */
  autoExpand?: (row: T) => boolean
  /** Child rows can show a summary when a parent has more children than were loaded. */
  renderChildFooter?: (row: T) => React.ReactNode
  /**
   * Free-form content under an opened row, across the full width (e.g. a container's panels). Rows with it get the
   * arrow even without children; it is only rendered while the row is open, so it can load its own data then.
   */
  renderDetail?: (row: T) => React.ReactNode
  /** What the arrow opens, for its label: "Show variations" by default. */
  expandLabel?: string
  isLoading?: boolean
  isError?: boolean
  emptyText?: string
  errorText?: string
  className?: string
}

const CELL = 'text-center align-middle'

/** The nearest ancestor that scrolls sideways (the table's own scroll box). */
function scrollBoxOf(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    if (['auto', 'scroll'].includes(getComputedStyle(node).overflowX)) return node
  }
  return null
}

/**
 * A detail row's content, held to the visible width of a wide, sideways-scrolling table and pinned to its left edge,
 * so it never runs off the right. Follows the box when the window resizes.
 */
const DetailContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<number | null>(null)
  useEffect(() => {
    const box = ref.current && scrollBoxOf(ref.current)
    if (!box) return
    const observer = new ResizeObserver(() => setWidth(box.clientWidth))
    observer.observe(box)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={ref} className="sticky left-0 p-4" style={width ? { width } : undefined}>
      {children}
    </div>
  )
}

/**
 * Parent / child table: a chevron opens a parent's children beneath it, indented and tinted.
 * Columns render both levels, told which one they are drawing.
 */
export function TreeTable<T>({
  columns,
  rows,
  getKey,
  getChildren,
  autoExpand,
  renderChildFooter,
  renderDetail,
  expandLabel = 'variations',
  isLoading,
  isError,
  emptyText = 'Nothing to show.',
  errorText = 'Could not load the list.',
  className,
}: TreeTableProps<T>) {
  // Explicit toggles override the automatic state, so a user can still close an auto-opened row
  const [toggled, setToggled] = useState<Map<string | number, boolean>>(new Map())
  const span = columns.length + 1

  const isOpen = (row: T) => toggled.get(getKey(row)) ?? autoExpand?.(row) ?? false
  const toggle = (row: T) => setToggled((current) => new Map(current).set(getKey(row), !isOpen(row)))

  return (
    <Table className={cn('min-w-full', className)}>
      <TableHeader className="sticky top-0 z-10 bg-surface shadow-sm">
        <TableRow>
          <TableHead className="w-10" aria-label="Expand" />
          {columns.map((column) => (
            <TableHead key={column.key} className={cn(CELL, column.className)}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={span}>
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            </TableCell>
          </TableRow>
        ) : isError || rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={span}>
              <div className={isError ? 'py-12 text-center font-medium text-danger-600' : 'py-12 text-center text-text-muted'}>{isError ? errorText : emptyText}</div>
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => {
            const children = getChildren(row)
            const expandable = children.length > 0 || Boolean(renderDetail)
            const open = expandable && isOpen(row)
            return (
              <React.Fragment key={getKey(row)}>
                <TableRow className="hover:bg-secondary-50">
                  <TableCell className="w-10 align-middle">
                    {expandable && (
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-label={open ? `Hide ${expandLabel}` : `Show ${expandLabel}`}
                        onClick={() => toggle(row)}
                        className="rounded p-1 text-text-muted hover:bg-secondary-100 hover:text-text-primary"
                      >
                        <svg className={cn('h-4 w-4 transition-transform', open && 'rotate-90')} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell key={column.key} className={cn(CELL, column.className)}>
                      {column.render(row, { isChild: false })}
                    </TableCell>
                  ))}
                </TableRow>
                {open &&
                  children.map((child) => (
                    <TableRow key={getKey(child)} className="bg-secondary-50/60">
                      <TableCell className="w-10" />
                      {columns.map((column) => (
                        <TableCell key={column.key} className={cn(CELL, column.className)}>
                          {column.render(child, { isChild: true, parent: row })}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                {open && renderDetail && (
                  <TableRow className="bg-secondary-50/60 hover:bg-secondary-50/60">
                    {/* `!p-0`: .ds-table-td forces its padding with !important, which would push the full-width detail past the scroll box */}
                    <TableCell colSpan={span} className="!p-0 text-left">
                      <DetailContent>{renderDetail(row)}</DetailContent>
                    </TableCell>
                  </TableRow>
                )}
                {open && renderChildFooter && (
                  <TableRow className="bg-secondary-50/60">
                    <TableCell colSpan={span} className="py-2 text-center text-xs text-text-muted">
                      {renderChildFooter(row)}
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            )
          })
        )}
      </TableBody>
    </Table>
  )
}
