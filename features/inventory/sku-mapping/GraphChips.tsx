'use client'

import React, { useState } from 'react'
import type { ChannelSku } from '@/services/api/skuMapping.api'
import { cn } from '@/utils/cn'

/** Chips shown before "+N more" once the graph is compact. */
const COLLAPSED = 8

interface GraphChipsProps {
  rows: ChannelSku[]
  selected: string | null
  locked: Set<string>
  collapse: boolean
  onSelect: (key: string) => void
  onRemove: (key: string) => void
}

/** The channel SKUs on the graph as chips: click selects, × removes (not while it has unsaved edits). */
export const GraphChips: React.FC<GraphChipsProps> = ({ rows, selected, locked, collapse, onSelect, onRemove }) => {
  const [expanded, setExpanded] = useState(false)
  if (rows.length === 0) return null
  const visible = collapse && !expanded ? rows.slice(0, COLLAPSED) : rows
  const hidden = rows.length - visible.length

  return (
    <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3">
      {visible.map((row) => {
        const active = row.key === selected
        return (
          <span key={row.key} className={cn('inline-flex items-center rounded border font-mono text-xs', active ? 'border-text-primary bg-text-primary text-white' : 'border-border bg-secondary-50 text-text-primary')}>
            <button type="button" onClick={() => onSelect(row.key)} className="py-1 pl-2 pr-1">
              {row.sku}
            </button>
            <button
              type="button"
              onClick={() => onRemove(row.key)}
              disabled={locked.has(row.key)}
              title={locked.has(row.key) ? 'Save or discard its changes first' : `Remove ${row.sku} from the graph`}
              aria-label={`Remove ${row.sku} from the graph`}
              className="px-1.5 py-1 opacity-70 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ×
            </button>
          </span>
        )
      })}
      {(hidden > 0 || expanded) && collapse && (
        <button type="button" onClick={() => setExpanded((open) => !open)} className="rounded border border-border bg-surface px-2 py-1 text-xs font-semibold text-text-primary hover:bg-secondary-50">
          {expanded ? 'Show less' : `+${hidden} more`}
        </button>
      )}
    </div>
  )
}
