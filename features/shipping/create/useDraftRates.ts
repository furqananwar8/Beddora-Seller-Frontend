import { useCallback, useEffect, useRef, useState } from 'react'
import { useRateStream } from '../useRateStream'
import type { ShipmentRequest } from '../types'

/**
 * Rates for the form: streamed while it is on the Rates step, and again whenever what is quoted changed since the
 * last stream. `refetch` re-quotes from scratch, e.g. after a quote expired.
 */
export function useDraftRates(request: ShipmentRequest, active: boolean) {
  const stream = useRateStream()
  const { start, reset: resetStream } = stream
  const key = JSON.stringify(request)
  const latest = useRef(request)
  latest.current = request
  const streamed = useRef<{ key: string; nonce: number } | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!active || (streamed.current?.key === key && streamed.current.nonce === nonce)) return
    streamed.current = { key, nonce }
    void start(latest.current)
  }, [active, key, nonce, start])

  const refetch = useCallback(() => setNonce((value) => value + 1), [])
  const reset = useCallback(() => {
    resetStream()
    streamed.current = null
  }, [resetStream])

  return { stream, key, refetch, reset }
}
