'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ReactFlow, type EdgeTypes, type NodeTypes } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { BindingEdge } from './BindingEdge'
import { ChannelSkuNode } from './ChannelSkuNode'
import { GraphActionsProvider, type GraphActions } from './GraphActions'
import { InternalSkuNode } from './InternalSkuNode'
import { layoutGraph, type GraphInput } from './graphLayout'

const nodeTypes: NodeTypes = { channel: ChannelSkuNode, internal: InternalSkuNode }
const edgeTypes: EdgeTypes = { binding: BindingEdge }
/** Vertical padding inside the canvas. */
const PADDING = 4

interface SkuGraphProps extends Omit<GraphInput, 'width'> {
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
 * The bindings graph: a fixed two-column layout drawn by React Flow (nodes, bezier edges, labels on edges).
 * Panning and zooming are off; the page scrolls instead, so the graph reads like the rest of the screen.
 */
export const SkuGraph: React.FC<SkuGraphProps> = ({ actions, channelLabel, ...input }) => {
  const [container, width] = useWidth<HTMLDivElement>()
  const { nodes, edges, height } = layoutGraph({ ...input, width })

  return (
    <div ref={container}>
      <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wider text-text-secondary">
        <span>{channelLabel} SKU</span>
        <span style={{ width: Math.min(340, width / 2) }}>Internal SKU</span>
      </div>
      {width > 0 && (
        <GraphActionsProvider value={actions}>
          <div style={{ height: height + PADDING * 2 }} className="sku-graph">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
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
