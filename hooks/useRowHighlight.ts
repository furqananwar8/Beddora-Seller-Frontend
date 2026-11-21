'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

/** Marks the row a link points at (`?highlight=<id>`): warm tint and outline, in the system's warning tone. */
export const HIGHLIGHT_ROW_CLASS = 'bg-warning-50 outline outline-2 -outline-offset-2 outline-warning-400 [&>td]:bg-warning-50'

const HIGHLIGHT_ATTR = 'data-highlighted-row'

/**
 * Reads `?highlight=<id>` and scrolls the matching row into view once it is on screen.
 * Spread `rowProps(row.id)` on the row and add `highlightClass(row.id)` to its classes.
 */
export function useRowHighlight(visibleIds: number[] | undefined) {
  const params = useSearchParams()
  const raw = Number(params.get('highlight'))
  const highlightId = Number.isInteger(raw) && raw > 0 ? raw : null
  const isVisible = highlightId !== null && !!visibleIds?.includes(highlightId)

  useEffect(() => {
    if (!isVisible) return
    document.querySelector(`[${HIGHLIGHT_ATTR}]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [isVisible, highlightId])

  return {
    highlightId,
    /** Spread on the row so the scroll-into-view can find it. */
    rowProps: (id: number) => (id === highlightId ? { [HIGHLIGHT_ATTR]: true } : {}),
    /** Class string for the row, or undefined; pass it to `cn(...)`. */
    highlightClass: (id: number) => (id === highlightId ? HIGHLIGHT_ROW_CLASS : undefined),
  }
}
