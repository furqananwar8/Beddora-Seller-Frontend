import type { Edge, Node } from '@xyflow/react'
import type { BindingComponent, ChannelSku } from '@/services/api/skuMapping.api'
import type { NodeStatus } from '../constants'

export const NODE_WIDTH = 340

/**
 * Nodes are neither draggable nor selectable, so React Flow would make them click-through; their buttons handle
 * clicks and focus themselves, so the wrapper takes pointer events but stays out of the tab order.
 */
const INTERACTIVE = { style: { pointerEvents: 'all' as const }, focusable: false, draggable: false }

const ROW = { regular: { height: 58, gap: 16 }, compact: { height: 38, gap: 9 } }

export interface ChannelNodeData extends Record<string, unknown> {
  row: ChannelSku
  status: NodeStatus
  selected: boolean
  compact: boolean
}

export interface InternalNodeData extends Record<string, unknown> {
  productId: number
  sku: string
  name: string
  onHand: number | null
  /** Quantity bound to the selected channel SKU, if any. */
  boundToSelected: number | null
  /** Clicking binds it to the selected channel SKU. */
  bindable: boolean
  compact: boolean
}

export interface BindingEdgeData extends Record<string, unknown> {
  row: ChannelSku
  productId: number
  quantity: number
  /** Belongs to the selected channel SKU. */
  active: boolean
  /** Another SKU is selected: drawn faint. */
  faded: boolean
  showBadge: boolean
}

export type ChannelNode = Node<ChannelNodeData, 'channel'>
export type InternalNode = Node<InternalNodeData, 'internal'>
export type BindingEdge = Edge<BindingEdgeData, 'binding'>

export interface GraphInput {
  rows: ChannelSku[]
  componentsOf: (row: ChannelSku) => BindingComponent[]
  statusOf: (row: ChannelSku) => NodeStatus
  /** Internal SKUs placed without a binding. */
  placed: Array<Pick<BindingComponent, 'productId' | 'sku' | 'name' | 'onHand'>>
  selected: string | null
  compact: boolean
  canBind: boolean
  width: number
}

export interface GraphLayout {
  nodes: Array<ChannelNode | InternalNode>
  edges: BindingEdge[]
  height: number
}

/**
 * Two columns: channel SKUs on the left in list order, internal SKUs on the right. Each internal node sits at the
 * average height of the channel SKUs bound to it, so edges stay close to horizontal, then is pushed down just enough
 * not to overlap the one above. Unbound (placed) internal SKUs go below.
 */
export function layoutGraph({ rows, componentsOf, statusOf, placed, selected, compact, canBind, width }: GraphInput): GraphLayout {
  const { height: rowHeight, gap } = compact ? ROW.compact : ROW.regular
  const pitch = rowHeight + gap
  const rightX = Math.max(NODE_WIDTH + 200, width - NODE_WIDTH)

  const nodes: GraphLayout['nodes'] = []
  const edges: BindingEdge[] = []
  const internal = new Map<number, { component: Pick<BindingComponent, 'productId' | 'sku' | 'name' | 'onHand'>; ys: number[] }>()
  const selectedComponents = new Map<number, number>()

  rows.forEach((row, index) => {
    const y = index * pitch
    const isSelected = row.key === selected
    nodes.push({ id: `c:${row.key}`, type: 'channel', position: { x: 0, y }, data: { row, status: statusOf(row), selected: isSelected, compact }, ...INTERACTIVE })

    for (const component of componentsOf(row)) {
      const entry = internal.get(component.productId) ?? { component, ys: [] }
      if (entry.component.onHand == null && component.onHand != null) entry.component = component
      entry.ys.push(y)
      internal.set(component.productId, entry)
      if (isSelected) selectedComponents.set(component.productId, component.quantity)
      edges.push({
        id: `e:${row.key}:${component.productId}`,
        type: 'binding',
        source: `c:${row.key}`,
        target: `i:${component.productId}`,
        data: {
          row,
          productId: component.productId,
          quantity: component.quantity,
          active: isSelected,
          faded: selected !== null && !isSelected,
          // Compact graphs only label the selected SKU's edges
          showBadge: !compact || isSelected,
        },
      })
    }
  })

  const bound = Array.from(internal.values(), ({ component, ys }) => ({ component, y: ys.reduce((sum, value) => sum + value, 0) / ys.length })).sort((a, b) => a.y - b.y)
  const unbound = placed.filter((item) => !internal.has(item.productId))

  let floor = -Infinity
  const positioned = [...bound, ...unbound.map((component) => ({ component, y: -Infinity }))].map(({ component, y }) => {
    const top = Math.max(y, floor === -Infinity ? 0 : floor + pitch)
    floor = top
    return { component, y: top }
  })

  for (const { component, y } of positioned) {
    nodes.push({
      id: `i:${component.productId}`,
      type: 'internal',
      position: { x: rightX, y },
      ...INTERACTIVE,
      data: {
        productId: component.productId,
        sku: component.sku,
        name: component.name,
        onHand: component.onHand ?? null,
        boundToSelected: selectedComponents.get(component.productId) ?? null,
        bindable: canBind && selected !== null,
        compact,
      },
    })
  }

  const lowest = Math.max(rows.length > 0 ? (rows.length - 1) * pitch : 0, floor === -Infinity ? 0 : floor)
  return { nodes, edges, height: rows.length === 0 && positioned.length === 0 ? 0 : lowest + rowHeight }
}
