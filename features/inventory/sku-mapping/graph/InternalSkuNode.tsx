'use client'

import React, { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@/utils/cn'
import { useGraphActions } from './GraphActions'
import type { InternalNode } from './graphLayout'
import { NODE_WIDTH, WHOLE_NODE_HANDLE } from './graphLayout'

const stock = (onHand: number | null) => (onHand === null ? 'no stock record' : `on hand ${onHand.toLocaleString()}`)

/**
 * Draggable to any spot. Clicking it never binds: a link is made only by drawing a line to it from a channel SKU's
 * box (or by picking it in the internal SKU picker), so touching a SKU bound elsewhere changes nothing.
 */
export const InternalSkuNode = memo(function InternalSkuNode({ data, dragging }: NodeProps<InternalNode>) {
  const { readOnly } = useGraphActions()
  const { sku, name, onHand, boundToSelected, compact } = data
  const bound = boundToSelected !== null

  const hint = bound ? `Bound ×${boundToSelected} · ${stock(onHand)}` : stock(onHand)

  return (
    <div
      title={`${name}\n${hint}\nDrag to move${readOnly ? '' : '; draw a line to it from a channel SKU to link'}`}
      style={{ width: NODE_WIDTH }}
      className={cn(
        'flex items-center gap-2 rounded-md border px-3 text-left outline-none transition-colors',
        compact ? 'h-[38px]' : 'h-[58px]',
        dragging ? 'cursor-grabbing shadow-md' : 'cursor-grab',
        bound ? 'border-primary-600 bg-secondary-50 ring-1 ring-primary-600' : 'border-border bg-surface'
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={!readOnly}
        // A line ends anywhere on this box but never starts here: pressing on it moves the node instead
        isConnectableStart={false}
        // Inert to the pointer so pressing anywhere moves the node; a line dropped on the box snaps to it (connectionRadius)
        className={`${WHOLE_NODE_HANDLE} !pointer-events-none`}
      />
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate font-mono text-xs', bound ? 'text-text-primary' : 'text-text-secondary')}>{sku}</span>
        {!compact && <span className="block truncate text-xs text-text-muted">{hint}</span>}
      </span>
      {compact && bound && <span className="shrink-0 text-xs text-text-muted">Bound ×{boundToSelected}</span>}
    </div>
  )
})
