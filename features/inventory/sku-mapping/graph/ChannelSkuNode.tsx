'use client'

import React, { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@/utils/cn'
import { marketplaceName } from '../constants'
import { MappingStatusBadge } from '../MappingStatusBadge'
import { useGraphActions } from './GraphActions'
import type { ChannelNode } from './graphLayout'
import { NODE_WIDTH } from './graphLayout'

export const ChannelSkuNode = memo(function ChannelSkuNode({ data }: NodeProps<ChannelNode>) {
  const { select } = useGraphActions()
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
      <Handle type="source" position={Position.Right} isConnectable={false} className="!h-2 !w-2 !border-0 !bg-transparent" />
    </button>
  )
})
