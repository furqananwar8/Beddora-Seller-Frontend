import { useCallback, useEffect, useRef, useState } from 'react'
import { EventSourceParserStream } from 'eventsource-parser/stream'
import { API_BASE_URL } from '@/services/api/baseApi'
import { store } from '@/store/store'
import { serverIssues, type ServerIssue } from '@/utils/apiErrors'
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

type StreamEvent = { [K in keyof RateStreamEvents]: { event: K; data: RateStreamEvents[K] } }[keyof RateStreamEvents]

const isStreamEvent = (name: string | undefined): name is keyof RateStreamEvents => name === 'quote' || name === 'provider' || name === 'rate' || name === 'unavailable' || name === 'done'

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

/** The JSON error a request is answered with before the stream starts (400 with issues, 401, 403…). */
async function failureOf(response: Response): Promise<{ message: string; issues: ServerIssue[] }> {
  const data: unknown = await response.json().catch(() => null)
  const body = data as { message?: string; error?: string } | null
  return { message: body?.message || body?.error || `Rates could not be loaded (${response.status})`, issues: serverIssues({ data }) }
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
      const token = store.getState().auth?.accessToken
      try {
        const response = await fetch(`${API_BASE_URL}/shipping/rates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...(token ? { authorization: `Bearer ${token}` } : {}) },
          credentials: 'include',
          body: JSON.stringify(request),
          signal: abort.signal,
        })
        if (!response.ok || !response.body) {
          const { message, issues } = await failureOf(response)
          setState((current) => ({ ...current, status: 'error', error: message, issues }))
          return
        }
        const reader = response.body.pipeThrough(new TextDecoderStream()).pipeThrough(new EventSourceParserStream()).getReader()
        try {
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            if (!isStreamEvent(value.event)) continue
            let data: unknown
            try {
              data = JSON.parse(value.data)
            } catch {
              continue
            }
            const frame = { event: value.event, data } as StreamEvent
            setState((current) => reduce(current, frame))
          }
        } finally {
          reader.cancel().catch(() => undefined)
        }
        // Closed without `done`: whatever arrived stays, but the list may be short
        setState((current) => (current.status === 'streaming' ? { ...current, status: 'error', error: 'The rate stream closed early. Some providers may be missing.' } : current))
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
