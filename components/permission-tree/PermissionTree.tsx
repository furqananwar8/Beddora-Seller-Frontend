'use client'

import React from 'react'

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

/** Every row below a node, at any depth. */
const descendants = (node: PermissionNode): PermissionNode[] => (node.children ?? []).flatMap((child) => [child, ...descendants(child)])

/**
 * Pages, their subpages, and subpages nested under a subpage (e.g. Price Analysis → Approval, Rejection).
 * A page's checkbox covers everything under it; a subpage's covers only its own read and write, so nested
 * permissions such as Approval are granted on their own.
 */
export const PermissionTree: React.FC<Props> = ({ nodes, selectedIds, onChange }) => {
  const isSelected = (id: number) => selectedIds.includes(id)
  const allIdsSelected = (ids: number[]) => ids.every((id) => isSelected(id))
  const someIdsSelected = (ids: number[]) => ids.some((id) => isSelected(id))

  const toggleIds = (ids: number[]) => {
    if (allIdsSelected(ids)) onChange(selectedIds.filter((x) => !ids.includes(x)))
    else onChange(Array.from(new Set([...selectedIds, ...ids])))
  }

  const Row: React.FC<{ node: PermissionNode }> = ({ node }) => {
    const isPage = node.subpage === null
    const below = descendants(node)
    // A page reads as checked when everything under it is; a subpage when its own permissions are
    const checked = isPage && below.length ? below.every((child) => allIdsSelected(child.allIds)) : allIdsSelected(node.allIds)
    const partial = isPage && below.length ? !checked && below.some((child) => someIdsSelected(child.allIds)) : false
    return (
      <div className="select-none">
        <div className={isPage ? 'flex items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50' : 'flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-50'}>
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
            checked={checked}
            ref={(el) => {
              if (el) el.indeterminate = partial
            }}
            onChange={() => toggleIds(node.allIds)}
          />
          <span className={isPage ? 'text-sm font-medium capitalize text-gray-800' : 'text-sm capitalize text-gray-700'}>{labelOf(node)}</span>
        </div>
        {node.children && node.children.length > 0 && (
          <div className="ml-6 border-l border-gray-200 pl-2">
            {node.children.map((child) => (
              <Row key={child.id} node={child} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <Row key={node.id} node={node} />
      ))}
    </div>
  )
}
