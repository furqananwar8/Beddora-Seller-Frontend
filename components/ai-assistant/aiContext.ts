import { useEffect, useRef } from 'react'

/**
 * Page-level context registration. A screen calls useAiContext() with its core
 * dataset; while it is mounted, that data is attached to every Ask AI question.
 * Use it where the data lives in local state / Redux slices (so neither the
 * API cache nor the DOM shows it faithfully), or to control exactly what the
 * AI may see for that screen.
 */

export interface AiContextEntry {
  /** Human name of the screen or widget, e.g. "Profit by product" */
  pageName: string
  /** The dataset. Keep it compact: it is trimmed to a few thousand characters. */
  data: unknown
}

const registry = new Map<symbol, () => AiContextEntry>()

export function useAiContext(entry: AiContextEntry): void {
  // Always expose the latest data without re-registering on every render
  const latest = useRef(entry)
  latest.current = entry

  useEffect(() => {
    const id = Symbol('ai-context')
    registry.set(id, () => latest.current)
    return () => {
      registry.delete(id)
    }
  }, [])
}

export function readAiContext(): AiContextEntry[] {
  return Array.from(registry.values()).map((get) => get())
}
