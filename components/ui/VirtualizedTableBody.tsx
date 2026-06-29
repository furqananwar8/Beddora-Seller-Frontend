'use client'

import React, { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

interface VirtualizedTableBodyProps<T> {
  items: T[]
  renderRow: (item: T, index: number) => React.ReactNode
  estimateSize?: number
  overscan?: number
  containerHeight?: number
  className?: string
}

/**
 * VirtualizedTableBody - Renders only visible table rows for performance
 * 
 * Use this for tables with 50+ rows to improve scroll performance
 * This component wraps rows in a scrollable container and only renders visible rows
 * 
 * Note: The renderRow function should return a TableRow component
 */
export function VirtualizedTableBody<T>({
  items,
  renderRow,
  estimateSize = 50,
  overscan = 5,
  containerHeight = 600,
  className,
}: VirtualizedTableBodyProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  })

  const itemsToRender = virtualizer.getVirtualItems()

  return (
    <div 
      ref={parentRef} 
      className={`overflow-auto ${className || ''}`}
      style={{ height: `${containerHeight}px`, maxHeight: `${containerHeight}px` }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {itemsToRender.map((virtualRow) => {
          const item = items[virtualRow.index]
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderRow(item, virtualRow.index)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
