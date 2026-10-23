'use client'

import React, { memo, useEffect, useRef, useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react'
import { cn } from '@/utils/cn'
import { sanitizeNumeric } from '@/utils/numericInput'
import { useGraphActions } from './GraphActions'
import type { BindingEdge as BindingEdgeType } from './graphLayout'

/** Where the ×N badge sits along the edge (0 = channel SKU, 1 = internal SKU). */
const BADGE_AT = 0.62
const MAX_QUANTITY = 10000

/** A binding: its ×N badge opens a number box in place; Enter or leaving the box applies, Esc cancels. */
export const BindingEdge = memo(function BindingEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps<BindingEdgeType>) {
  const { setQuantity, readOnly } = useGraphActions()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const [path] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })

  useEffect(() => {
    if (editing) input.current?.select()
  }, [editing])

  if (!data) return null
  const { row, productId, quantity, active, faded, showBadge } = data
  const x = sourceX + (targetX - sourceX) * BADGE_AT
  const y = sourceY + (targetY - sourceY) * BADGE_AT

  const open = () => {
    if (readOnly) return
    setValue(String(quantity))
    setEditing(true)
  }
  const commit = () => {
    // Empty or 0 keeps the old quantity: removing a binding is Unbind, not ×0
    const next = Math.min(Number(value), MAX_QUANTITY)
    if (next >= 1 && next !== quantity) setQuantity(row, productId, next)
    setEditing(false)
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        className={active ? '!stroke-primary-600' : '!stroke-secondary-300'}
        style={{ strokeWidth: active ? 2 : 1.25, opacity: faded ? 0.35 : 1 }}
      />
      {(showBadge || editing) && (
        <EdgeLabelRenderer>
          <div className="nodrag nopan absolute" style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`, pointerEvents: 'all' }}>
            {editing ? (
              <input
                ref={input}
                // Text, not number: a number box still accepts "-" and "e"; digits only here
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={value}
                aria-label={`Units of internal SKU per ${row.sku}`}
                onChange={(event) => setValue(sanitizeNumeric(event.target.value))}
                onBlur={commit}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commit()
                  if (event.key === 'Escape') setEditing(false)
                  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                    event.preventDefault()
                    const step = event.key === 'ArrowUp' ? 1 : -1
                    setValue((current) => String(Math.min(MAX_QUANTITY, Math.max(1, (Number(current) || 0) + step))))
                  }
                }}
                className="h-8 w-16 rounded-md border-2 border-text-primary bg-surface px-2 text-sm font-semibold tabular-nums outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={open}
                disabled={readOnly}
                title={readOnly ? undefined : 'Change quantity'}
                className={cn(
                  'rounded border px-2 py-0.5 text-xs font-semibold tabular-nums transition-colors',
                  active ? 'border-primary-600 bg-primary-600 text-white' : 'border-border bg-surface text-text-primary',
                  faded && 'opacity-50',
                  !readOnly && 'hover:border-primary-500'
                )}
              >
                ×{quantity}
              </button>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
})
