import type { Edge, Node, XYPosition } from '@xyflow/react'
import type { BindingComponent, ChannelSku } from '@/services/api/skuMapping.api'
import type { NodeStatus } from '../constants'

export const NODE_WIDTH = 340

/**
 * Channel nodes are neither draggable nor selectable, so React Flow would make them click-through; their buttons
 * handle clicks and focus themselves, so the wrapper takes pointer events but stays out of the tab order.
 */
const FIXED = { style: { pointerEvents: 'all' as const }, focusable: false, draggable: false }
/** Room kept between the two columns and on the right edge (the selected ring draws outside the node). */
const COLUMN_GAP = 80
const EDGE_MARGIN = 8
/** Narrowest canvas that fits both columns with room for the edges; narrower screens scroll sideways. */
export const MIN_GRAPH_WIDTH = NODE_WIDTH * 2 + 200 + EDGE_MARGIN

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
  width: number
  /** Internal nodes the user dragged, by node id: they keep that spot instead of the computed one. */
  moved: Record<string, XYPosition>
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
export function layoutGraph({ rows, componentsOf, statusOf, placed, selected, compact, width, moved }: GraphInput): GraphLayout {
  const { height: rowHeight, gap } = compact ? ROW.compact : ROW.regular
  const pitch = rowHeight + gap
  const rightX = Math.max(NODE_WIDTH + 200, width - NODE_WIDTH - EDGE_MARGIN)

  const nodes: GraphLayout['nodes'] = []
  const edges: BindingEdge[] = []
  const internal = new Map<number, { component: Pick<BindingComponent, 'productId' | 'sku' | 'name' | 'onHand'>; ys: number[] }>()
  const selectedComponents = new Map<number, number>()

  rows.forEach((row, index) => {
    const y = index * pitch
    const isSelected = row.key === selected
    nodes.push({ id: `c:${row.key}`, type: 'channel', position: { x: 0, y }, data: { row, status: statusOf(row), selected: isSelected, compact }, ...FIXED })

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

  // The canvas is as tall as the laid-out graph plus one spare row, and dragging stays inside it: moving a node
  // never makes the graph (and the page) taller. Positions saved from a larger canvas are pulled back in.
  const naturalBottom = Math.max(rows.length > 0 ? (rows.length - 1) * pitch : 0, ...positioned.map(({ y }) => y))
  const lowestTop = naturalBottom + pitch
  for (const { component, y } of positioned) {
    const id = `i:${component.productId}`
    const saved = moved[id]
    const position = saved ? { x: saved.x, y: Math.min(Math.max(saved.y, 0), lowestTop) } : { x: rightX, y }
    nodes.push({
      id,
      type: 'internal',
      position,
      // Draggable anywhere right of the channel column; edges and their badges follow
      draggable: true,
      focusable: false,
      extent: [
        [NODE_WIDTH + COLUMN_GAP, 0],
        [Math.max(rightX, NODE_WIDTH + COLUMN_GAP) + NODE_WIDTH, lowestTop + rowHeight],
      ],
      data: {
        productId: component.productId,
        sku: component.sku,
        name: component.name,
        onHand: component.onHand ?? null,
        boundToSelected: selectedComponents.get(component.productId) ?? null,
        compact,
      },
    })
  }

  return { nodes, edges, height: rows.length === 0 && positioned.length === 0 ? 0 : lowestTop + rowHeight }
}

/** A handle covering its whole node, invisible: lines start (channel SKU) or end (internal SKU) anywhere on the box. */
export const WHOLE_NODE_HANDLE = '!absolute !inset-0 !h-full !w-full !translate-x-0 !translate-y-0 !transform-none !rounded-md !border-0 !bg-transparent !opacity-0'
