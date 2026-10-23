'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ReactFlow, type EdgeTypes, type NodeMouseHandler, type NodeTypes, type OnNodesChange, type XYPosition } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { BindingEdge } from './BindingEdge'
import { ChannelSkuNode } from './ChannelSkuNode'
import { GraphActionsProvider, type GraphActions } from './GraphActions'
import { InternalSkuNode } from './InternalSkuNode'
import { MIN_GRAPH_WIDTH, layoutGraph, type GraphInput, type InternalNode } from './graphLayout'

const nodeTypes: NodeTypes = { channel: ChannelSkuNode, internal: InternalSkuNode }
const edgeTypes: EdgeTypes = { binding: BindingEdge }
/** Vertical padding inside the canvas. */
const PADDING = 4

interface SkuGraphProps extends Omit<GraphInput, 'width' | 'moved'> {
  actions: GraphActions
  channelLabel: string
}

/** Width of an element, kept up to date as it resizes. */
function useWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}

/**
 * The bindings graph drawn by React Flow: channel SKUs in a fixed column on the left, internal SKUs on the right.
 * Internal nodes can be dragged anywhere right of the channel column and keep that spot (edges and their ×N badges
 * follow); "Reset layout" puts them back. Panning and zooming are off so the page scrolls as usual.
 */
export const SkuGraph: React.FC<SkuGraphProps> = ({ actions, channelLabel, ...input }) => {
  const [container, available] = useWidth<HTMLDivElement>()
  const width = Math.max(available, MIN_GRAPH_WIDTH)
  const [moved, setMoved] = useState<Record<string, XYPosition>>({})
  const { nodes, edges, height } = layoutGraph({ ...input, width, moved })

  const placedAt = new Map(nodes.map((node) => [node.id, node.position]))
  // A click is reported as a position change to the same spot; only a real move counts as "moved"
  const onNodesChange: OnNodesChange = (changes) => {
    const positions = changes.flatMap((change) => {
      if (change.type !== 'position' || !change.position) return []
      const at = placedAt.get(change.id)
      return at && at.x === change.position.x && at.y === change.position.y ? [] : [[change.id, change.position] as const]
    })
    if (positions.length > 0) setMoved((current) => ({ ...current, ...Object.fromEntries(positions) }))
  }

  // React Flow skips onNodeClick after a drag, so a dropped node isn't bound by accident
  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      const data = (node as InternalNode).data
      if (node.type === 'internal' && data.bindable && data.boundToSelected === null && !actions.readOnly) actions.bindToSelected(data.productId)
    },
    [actions]
  )

  const hasMoved = Object.keys(moved).length > 0

  return (
    <div ref={container} className="overflow-x-auto">
      <div style={{ width }} className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-text-secondary">
        <span>{channelLabel} SKU</span>
        <span className="flex items-center justify-between gap-2" style={{ width: Math.min(340, width / 2) }}>
          Internal SKU
          {hasMoved && (
            <button type="button" onClick={() => setMoved({})} className="font-medium normal-case tracking-normal text-text-muted hover:text-text-primary hover:underline">
              Reset layout
            </button>
          )}
        </span>
      </div>
      {available > 0 && (
        <GraphActionsProvider value={actions}>
          <div style={{ height: height + PADDING * 2, width }} className="sku-graph">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={onNodesChange}
              onNodeClick={onNodeClick}
              viewport={{ x: 0, y: PADDING, zoom: 1 }}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              panOnDrag={false}
              panOnScroll={false}
              zoomOnScroll={false}
              zoomOnPinch={false}
              zoomOnDoubleClick={false}
              preventScrolling={false}
              proOptions={{ hideAttribution: true }}
            />
          </div>
        </GraphActionsProvider>
      )}
    </div>
  )
}
