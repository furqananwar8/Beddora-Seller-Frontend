'use client'

import React from 'react'
import type { useColumnResize } from '@/hooks/useColumnResize'
import { cn } from '@/utils/cn'

interface ColumnResizeHandleProps {
  /** What `useColumnResize` returned for this column. */
  resize: ReturnType<typeof useColumnResize>
  /** Which column it resizes, for screen readers ("SKU"). */
  column: string
}

/**
 * The drag handle on a header cell's right edge. The cell must be positioned (a sticky header already is). Drag it,
 * press Left / Right when focused, or double-click to put the column back to its starting width.
 */
export const ColumnResizeHandle: React.FC<ColumnResizeHandleProps> = ({ resize, column }) => (
  <span
    {...resize.handleProps}
    aria-label={`Resize the ${column} column`}
    title="Drag to resize"
    className={cn(
      'absolute right-0 top-0 z-10 h-full w-2 cursor-col-resize touch-none select-none after:absolute after:right-0 after:top-1/4 after:h-1/2 after:w-0.5 after:rounded after:bg-border hover:after:bg-primary-500 focus-visible:after:bg-primary-500',
      resize.dragging && 'after:bg-primary-600'
    )}
  />
)

/**
 * Put on the header of a table's LAST column. A table set to fill its container hands any spare width to every column, so
 * a resized column would not follow the drag; this makes the last column take all of it instead.
 */
export const fillRemainingWidth: React.CSSProperties = { width: '100%' }

/** The inline width of a resizable column's cells (min and max too, so a table's auto layout cannot stretch it). */
export const columnWidthStyle = (width: number): React.CSSProperties => ({ width, minWidth: width, maxWidth: width })
