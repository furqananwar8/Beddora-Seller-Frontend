import type { CostCenterNode } from '@/services/api/costCenters.api'

export interface CostCenterTreeNode extends CostCenterNode {
  children: CostCenterTreeNode[]
}

/**
 * Nests a flat branch (as the API sends it, in code order) under each parent. Nodes whose parent is not in the
 * list hang at the top, which is where the L1's direct children land.
 */
export function buildCostCenterTree(nodes: CostCenterNode[]): CostCenterTreeNode[] {
  const byId = new Map<number, CostCenterTreeNode>(nodes.map((node) => [node.id, { ...node, children: [] }]))
  const top: CostCenterTreeNode[] = []
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined
    ;(parent ? parent.children : top).push(node)
  }
  return top
}

export interface VisibleRow {
  node: CostCenterTreeNode
  /** 0 for the L1's direct children. */
  depth: number
}

/** The tree as table rows, parents straight above their children, skipping what sits under a collapsed node. */
export function visibleRows(tree: CostCenterTreeNode[], collapsed: ReadonlySet<number>, depth = 0): VisibleRow[] {
  return tree.flatMap((node) => [{ node, depth }, ...(collapsed.has(node.id) ? [] : visibleRows(node.children, collapsed, depth + 1))])
}
