'use client'

import React, { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@/utils/cn'
import { marketplaceName } from '../constants'
import { MappingStatusBadge } from '../MappingStatusBadge'
import { useGraphActions } from './GraphActions'
import type { ChannelNode } from './graphLayout'
import { NODE_WIDTH, WHOLE_NODE_HANDLE } from './graphLayout'

export const ChannelSkuNode = memo(function ChannelSkuNode({ data }: NodeProps<ChannelNode>) {
  const { select, unbindAll, readOnly } = useGraphActions()
  const { row, status, selected, compact, boundCount } = data

  return (
    // A div, not a button: it holds the Unbind button, and buttons cannot nest
    <div
      role="button"
      tabIndex={0}
      onClick={() => select(row.key)}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          select(row.key)
        }
      }}
      aria-pressed={selected}
      title={row.productName ?? row.sku}
      style={{ width: NODE_WIDTH }}
      className={cn(
        'nodrag flex cursor-pointer items-center gap-2 rounded-md border bg-surface px-3 text-left transition-colors',
        compact ? 'h-[38px]' : 'h-[58px]',
        selected ? 'border-primary-600 bg-secondary-50 ring-1 ring-primary-600' : 'border-border hover:border-secondary-400'
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-mono text-xs text-text-primary">{row.sku}</span>
        {!compact && <span className="block truncate text-xs text-text-muted">{marketplaceName(row.marketplace)}{row.reference ? ` · ${row.reference}` : ''}</span>}
      </span>
      <MappingStatusBadge status={status} />
      {boundCount > 0 && !readOnly && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            unbindAll(row.key)
          }}
          title={`Unbind ${boundCount === 1 ? 'its internal SKU' : `all ${boundCount} internal SKUs`} from this channel SKU (they stay on the graph)`}
          className="nodrag nopan relative z-10 shrink-0 rounded border border-border bg-surface px-2 py-0.5 text-xs font-medium text-danger-600 hover:border-danger-300 hover:bg-danger-50"
        >
          Unbind
        </button>
      )}
      {/* The whole box is the handle (invisible): press and drag from anywhere on it to an internal SKU to link them; a click still selects */}
      <Handle type="source" position={Position.Right} isConnectable={!readOnly} className={WHOLE_NODE_HANDLE} />
    </div>
  )
})
