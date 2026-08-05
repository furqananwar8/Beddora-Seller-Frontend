'use client'

import React from 'react'

export interface PermissionNode {
  id: number
  name: string
  page: string
  subpage: string | null
  allIds: number[] // read + write IDs grouped together
  children?: PermissionNode[]
}

interface Props {
  nodes: PermissionNode[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
}

export const PermissionTree: React.FC<Props> = ({ nodes, selectedIds, onChange }) => {
  const isSelected = (id: number) => selectedIds.includes(id)

  const allIdsSelected = (ids: number[]) => ids.every((id) => isSelected(id))
  const someIdsSelected = (ids: number[]) => ids.some((id) => isSelected(id))

  const toggleIds = (ids: number[]) => {
    const allSelected = allIdsSelected(ids)
    if (allSelected) {
      onChange(selectedIds.filter((x) => !ids.includes(x)))
    } else {
      onChange(Array.from(new Set([...selectedIds, ...ids])))
    }
  }

  const allChildrenSelected = (node: PermissionNode): boolean => {
    if (!node.children?.length) return allIdsSelected(node.allIds)
    return node.children.every((c) => allIdsSelected(c.allIds))
  }

  const someChildrenSelected = (node: PermissionNode): boolean => {
    if (!node.children?.length) return allIdsSelected(node.allIds)
    return node.children.some((c) =>
      allIdsSelected(c.allIds) || someIdsSelected(c.allIds)
    )
  }

  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <div key={node.id} className="select-none">
          <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-50 rounded">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
              checked={allChildrenSelected(node)}
              ref={(el) => {
                if (el) {
                  el.indeterminate =
                    someChildrenSelected(node) && !allChildrenSelected(node)
                }
              }}
              onChange={() => toggleIds(node.allIds)}
            />
            <span className="text-sm font-medium text-gray-800 capitalize">
              {node.page.replace(/-/g, ' ')}
            </span>
          </div>

          {node.children && node.children.length > 0 && (
            <div className="ml-6 border-l border-gray-200 pl-2">
              {node.children.map((child) => (
                <div
                  key={child.id}
                  className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    checked={allIdsSelected(child.allIds)}
                    onChange={() => toggleIds(child.allIds)}
                  />
                  <span className="text-sm text-gray-700 capitalize">
                    {child.subpage?.replace(/-/g, ' ') || child.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}