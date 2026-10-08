'use client'

import React, { useMemo, useState } from 'react'
import { Spinner } from '@/design-system/loaders'
import { useGetCostCenterDescendantsQuery, type CostCenterRoot } from '@/services/api/costCenters.api'
import { cn } from '@/utils/cn'
import { formatCostCenterCode } from './costCenterCode'
import { buildCostCenterTree, visibleRows } from './costCenterTree'
import { LevelBadge } from './LevelBadge'

/** Account code first, then Name (which grows and carries the indentation), then Level; fixed widths keep rows under the header. */
const GRID = 'grid grid-cols-[minmax(9rem,14rem)_minmax(0,1fr)_5rem] items-center gap-4 px-4'
const INDENT_REM = 1.5

const Chevron: React.FC<{ open: boolean }> = ({ open }) => (
  <svg className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-90')} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

/** Everything under an L1 as a table, each cost center indented under its parent. Loads only while its row is open. */
export const BranchDetail: React.FC<{ root: CostCenterRoot }> = ({ root }) => {
  const { data, isLoading, isError } = useGetCostCenterDescendantsQuery(root.id)
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(new Set())
  const tree = useMemo(() => buildCostCenterTree(data ?? []), [data])
  const rows = useMemo(() => visibleRows(tree, collapsed), [tree, collapsed])
  const matched = useMemo(() => new Set(root.matchIds), [root.matchIds])

  const toggle = (id: number) =>
    setCollapsed((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner />
      </div>
    )
  }
  if (isError) return <p className="text-sm text-danger-600">Could not load the levels under {root.name}.</p>
  if (tree.length === 0) return <p className="text-sm text-text-muted">Nothing under {root.name} yet. Add levels from “Create cost center & hierarchy”.</p>

  return (
    <div className="max-w-4xl overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-4 py-2.5 text-sm font-semibold text-text-primary">Hierarchy under {root.name}</div>
      <div role="table" aria-label={`Hierarchy under ${root.name}`} className="text-sm">
        <div role="row" className={cn(GRID, 'border-b border-border bg-secondary-50 py-2 text-xs font-medium uppercase tracking-wide text-text-muted')}>
          <span role="columnheader">Account Code</span>
          <span role="columnheader">Name</span>
          <span role="columnheader">Level</span>
        </div>
        {rows.map(({ node, depth }) => {
          const hasChildren = node.children.length > 0
          const open = !collapsed.has(node.id)
          return (
            <div
              key={node.id}
              role="row"
              className={cn(GRID, 'border-b border-border/60 py-2 last:border-b-0 hover:bg-secondary-50/70', matched.has(node.id) && 'bg-warning-50 hover:bg-warning-50')}
            >
              <span role="cell" className="truncate font-mono text-xs text-text-secondary">
                {formatCostCenterCode(node.code)}
              </span>
              <span role="cell" className="flex min-w-0 items-center gap-1.5" style={{ paddingLeft: `${depth * INDENT_REM}rem` }}>
                {hasChildren ? (
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-label={open ? `Hide what is under ${node.name}` : `Show what is under ${node.name}`}
                    onClick={() => toggle(node.id)}
                    className="rounded p-0.5 text-text-muted hover:bg-secondary-100 hover:text-text-primary"
                  >
                    <Chevron open={open} />
                  </button>
                ) : (
                  <span className="w-[1.125rem] text-center text-text-muted" aria-hidden>
                    {depth > 0 ? '└' : '•'}
                  </span>
                )}
                <span className={cn('truncate text-text-primary', (hasChildren || matched.has(node.id)) && 'font-medium')}>{node.name}</span>
              </span>
              <span role="cell">
                <LevelBadge level={node.level} />
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
