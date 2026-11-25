import { useCallback, useEffect, useRef, useState } from 'react'
import { API_BASE_URL } from '@/services/api/baseApi'
import type { ServerIssue } from '@/utils/apiErrors'
import { readSse, streamFailure } from '@/utils/sseStream'
import type { ProviderEvent, ProviderId, Rate, RateStreamEvents, ShipmentRequest, UnavailableService } from './types'

export type RateStreamStatus = 'idle' | 'streaming' | 'done' | 'error'

interface RateStreamState {
  quoteId: string | null
  rates: Rate[]
  providers: Partial<Record<ProviderId, ProviderEvent>>
  unavailable: UnavailableService[]
  status: RateStreamStatus
  error: string | null
  /** Field problems from a 400 sent before the stream started. */
  issues: ServerIssue[]
}

const IDLE: RateStreamState = { quoteId: null, rates: [], providers: {}, unavailable: [], status: 'idle', error: null, issues: [] }

export type StreamEvent = { [K in keyof RateStreamEvents]: { event: K; data: RateStreamEvents[K] } }[keyof RateStreamEvents]

const isStreamEvent = (name: string | undefined): name is keyof RateStreamEvents => name === 'quote' || name === 'provider' || name === 'rate' || name === 'unavailable' || name === 'done'

/**
 * `POST /shipping/rates` read as SSE: each frame goes to `onFrame`. Resolves 'ended' after the stream closed, or
 * 'failed' when it was refused before starting (`onRefused` gets the message and field issues).
 */
export async function streamRates(
  request: ShipmentRequest,
  signal: AbortSignal,
  onFrame: (frame: StreamEvent) => void,
  onRefused: (failure: { error: string; issues: ServerIssue[] }) => void
): Promise<'ended' | 'early' | 'failed'> {
  const response = await fetch(`${API_BASE_URL}/shipping/rates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    credentials: 'include',
    body: JSON.stringify(request),
    signal,
  })
  if (!response.ok || !response.body) {
    const { message, issues } = await streamFailure(response, 'Rates could not be loaded')
    onRefused({ error: message, issues })
    return 'failed'
  }
  let done = false
  await readSse(response.body, (name, data) => {
    if (!isStreamEvent(name)) return
    if (name === 'done') done = true
    onFrame({ event: name, data } as StreamEvent)
  })
  return done ? 'ended' : 'early'
}

/** One SSE frame folded into the state. */
function reduce(state: RateStreamState, frame: StreamEvent): RateStreamState {
  switch (frame.event) {
    case 'quote':
      return { ...state, quoteId: frame.data.quoteId }
    case 'provider':
      return { ...state, providers: { ...state.providers, [frame.data.provider]: frame.data } }
    case 'rate':
      return { ...state, rates: [...state.rates, frame.data] }
    case 'unavailable':
      return { ...state, unavailable: [...state.unavailable, frame.data] }
    case 'done':
      return { ...state, quoteId: frame.data.quoteId, status: 'done' }
  }
}

/**
 * `POST /shipping/rates` read as Server-Sent Events (EventSource can't POST). Rates and per-provider status arrive
 * as each provider answers. Starting again, `cancel`, or unmounting aborts the stream in flight.
 */
export function useRateStream() {
  const [state, setState] = useState<RateStreamState>(IDLE)
  const controller = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    controller.current?.abort()
    controller.current = null
  }, [])

  const start = useCallback(
    async (request: ShipmentRequest) => {
      cancel()
      const abort = new AbortController()
      controller.current = abort
      setState({ ...IDLE, status: 'streaming' })
      try {
        const ended = await streamRates(request, abort.signal, (frame) => setState((current) => reduce(current, frame)), (failure) => setState((current) => ({ ...current, status: 'error', ...failure })))
        // Closed without `done`: whatever arrived stays, but the list may be short
        if (ended === 'early') setState((current) => (current.status === 'streaming' ? { ...current, status: 'error', error: 'The rate stream closed early. Some providers may be missing.' } : current))
      } catch (error) {
        if (abort.signal.aborted) return
        setState((current) => ({ ...current, status: 'error', error: (error as Error).message || 'Rates could not be loaded' }))
      } finally {
        if (controller.current === abort) controller.current = null
      }
    },
    [cancel]
  )

  const reset = useCallback(() => {
    cancel()
    setState(IDLE)
  }, [cancel])

  useEffect(() => cancel, [cancel])

  return { ...state, start, cancel, reset }
}

export type RateStream = ReturnType<typeof useRateStream>
