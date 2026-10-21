'use client'

import React, { useMemo } from 'react'
import { checkState, toggleNode } from './permissionSelection'

export interface PermissionNode {
  id: number
  name: string
  page: string
  subpage: string | null
  allIds: number[] // read + write IDs grouped together (a page: every permission under it)
  children?: PermissionNode[]
}

interface Props {
  nodes: PermissionNode[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
}

/** The row's name: the page, or the last part of a subpage (`price-analysis.approval` → "approval"). */
const labelOf = (node: PermissionNode) => (node.subpage ? (node.subpage.split('.').pop() ?? node.subpage) : node.page).replace(/-/g, ' ')

interface RowProps {
  node: PermissionNode
  selected: ReadonlySet<number>
  onToggle: (node: PermissionNode) => void
}

// Declared at module level so re-renders update rows in place; a component created inside PermissionTree
// is a new type each render, which remounts the list and resets the modal's scroll position.
const Row: React.FC<RowProps> = ({ node, selected, onToggle }) => {
  const isPage = node.subpage === null
  const state = checkState(node, selected)
  return (
    <div className="select-none">
      <div className={isPage ? 'flex items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50' : 'flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-50'}>
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-blue-600"
          checked={state === 'checked'}
          ref={(el) => {
            if (el) el.indeterminate = state === 'partial'
          }}
          onChange={() => onToggle(node)}
        />
        <span className={isPage ? 'text-sm font-medium capitalize text-gray-800' : 'text-sm capitalize text-gray-700'}>{labelOf(node)}</span>
      </div>
      {node.children && node.children.length > 0 && (
        <div className="ml-6 border-l border-gray-200 pl-2">
          {node.children.map((child) => (
            <Row key={child.id} node={child} selected={selected} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Pages, their subpages, and subpages nested under a subpage (e.g. Price Analysis → Approval, Rejection).
 * Every checkbox covers its own row and everything below it; see permissionSelection for the rules.
 */
export const PermissionTree: React.FC<Props> = ({ nodes, selectedIds, onChange }) => {
  const selected = useMemo(() => new Set(selectedIds), [selectedIds])
  const onToggle = (node: PermissionNode) => onChange(toggleNode(nodes, node, selectedIds))

  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <Row key={node.id} node={node} selected={selected} onToggle={onToggle} />
      ))}
    </div>
  )
}
