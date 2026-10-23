'use client'

import React, { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@/utils/cn'
import { useGraphActions } from './GraphActions'
import type { InternalNode } from './graphLayout'
import { NODE_WIDTH } from './graphLayout'

const stock = (onHand: number | null) => (onHand === null ? 'no stock record' : `on hand ${onHand.toLocaleString()}`)

/**
 * Draggable: a mouse click reaches the screen through React Flow's onNodeClick (which skips drags), so dropping a
 * node never binds it. Keyboard users bind with Enter or Space.
 */
export const InternalSkuNode = memo(function InternalSkuNode({ data, dragging }: NodeProps<InternalNode>) {
  const { bindToSelected, readOnly } = useGraphActions()
  const { productId, sku, name, onHand, boundToSelected, bindable, compact } = data
  const bound = boundToSelected !== null
  const clickable = bindable && !bound && !readOnly

  const hint = bound ? `Bound ×${boundToSelected} · ${stock(onHand)}` : clickable ? `Click to bind · ${stock(onHand)}` : stock(onHand)

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={!clickable}
      onKeyDown={(event) => {
        if (clickable && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          bindToSelected(productId)
        }
      }}
      title={`${name}\n${hint}\nDrag to move`}
      style={{ width: NODE_WIDTH }}
      className={cn(
        'flex items-center gap-2 rounded-md border px-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary-600',
        compact ? 'h-[38px]' : 'h-[58px]',
        dragging ? 'cursor-grabbing shadow-md' : clickable ? 'cursor-pointer' : 'cursor-grab',
        bound ? 'border-primary-600 bg-secondary-50 ring-1 ring-primary-600' : 'border-border bg-surface',
        clickable && 'border-dashed hover:border-primary-500 hover:bg-secondary-50'
      )}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} className="!h-2 !w-2 !border-0 !bg-transparent" />
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate font-mono text-xs', bound ? 'text-text-primary' : 'text-text-secondary')}>{sku}</span>
        {!compact && <span className="block truncate text-xs text-text-muted">{hint}</span>}
      </span>
      {compact && bound && <span className="shrink-0 text-xs text-text-muted">Bound ×{boundToSelected}</span>}
    </div>
  )
})
