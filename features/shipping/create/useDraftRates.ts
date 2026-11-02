import { useCallback, useEffect, useRef } from 'react'
import { useRateStream } from '../useRateStream'
import type { DraftAction, ShipmentDraft } from './shipmentDraft'
import { toShipmentRequest } from './shipmentRules'

interface DraftRatesOptions {
  /** Hold the stream back, e.g. while required details are missing. */
  enabled?: boolean
  /** Wait for typing to settle before re-quoting an edited draft. */
  debounceMs?: number
}

/**
 * Rates for the draft: streamed while it is on the Rates step, and again whenever the draft changed since the
 * last stream (every edit bumps its revision). `refetch` re-quotes from scratch, e.g. after a quote expired.
 */
export function useDraftRates(draft: ShipmentDraft, dispatch: React.Dispatch<DraftAction>, crossBorder: boolean, { enabled = true, debounceMs = 0 }: DraftRatesOptions = {}) {
  const stream = useRateStream()
  const { start, reset: resetStream } = stream
  const streamedRevision = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled || draft.step !== 2 || streamedRevision.current === draft.revision) return
    const timer = window.setTimeout(() => {
      streamedRevision.current = draft.revision
      void start(toShipmentRequest(draft, crossBorder))
    }, debounceMs)
    return () => window.clearTimeout(timer)
  }, [draft, crossBorder, enabled, debounceMs, start])

  const refetch = useCallback(() => {
    streamedRevision.current = null
    dispatch({ type: 'selectRate', rateId: null })
    dispatch({ type: 'goTo', step: 2 })
  }, [dispatch])

  const reset = useCallback(() => {
    resetStream()
    streamedRevision.current = null
  }, [resetStream])

  const rate = stream.rates.find((item) => item.rateId === draft.selectedRateId)
  return { stream, rate, refetch, reset }
}
