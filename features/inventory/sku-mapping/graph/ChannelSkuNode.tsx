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
  const { select, readOnly } = useGraphActions()
  const { row, status, selected, compact } = data

  return (
    <button
      type="button"
      onClick={() => select(row.key)}
      aria-pressed={selected}
      title={row.productName ?? row.sku}
      style={{ width: NODE_WIDTH }}
      className={cn(
        'nodrag flex items-center gap-2 rounded-md border bg-surface px-3 text-left transition-colors',
        compact ? 'h-[38px]' : 'h-[58px]',
        selected ? 'border-primary-600 bg-secondary-50 ring-1 ring-primary-600' : 'border-border hover:border-secondary-400'
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-mono text-xs text-text-primary">{row.sku}</span>
        {!compact && <span className="block truncate text-xs text-text-muted">{marketplaceName(row.marketplace)}{row.reference ? ` · ${row.reference}` : ''}</span>}
      </span>
      <MappingStatusBadge status={status} />
      {/* The whole box is the handle (invisible): press and drag from anywhere on it to an internal SKU to link them; a click still selects */}
      <Handle type="source" position={Position.Right} isConnectable={!readOnly} className={WHOLE_NODE_HANDLE} />
    </button>
  )
})
