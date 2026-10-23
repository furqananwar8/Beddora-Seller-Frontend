'use client'

import { createContext, useContext } from 'react'
import type { ChannelSku } from '@/services/api/skuMapping.api'

/** What the graph's nodes and edges can ask the screen to do (kept out of node data so layout stays pure). */
export interface GraphActions {
  select: (key: string) => void
  bindToSelected: (productId: number) => void
  setQuantity: (row: ChannelSku, productId: number, quantity: number) => void
  readOnly: boolean
}

const GraphActionsContext = createContext<GraphActions | null>(null)

export const GraphActionsProvider = GraphActionsContext.Provider

export function useGraphActions(): GraphActions {
  const actions = useContext(GraphActionsContext)
  if (!actions) throw new Error('useGraphActions must be used inside <GraphActionsProvider>')
  return actions
}
