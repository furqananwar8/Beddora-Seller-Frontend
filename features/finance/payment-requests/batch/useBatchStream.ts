import { useCallback, useEffect, useRef, useState } from 'react'
import { API_BASE_URL, baseApi } from '@/services/api/baseApi'
import { useAppDispatch } from '@/store/hooks'
import { readSse, streamFailure } from '@/utils/sseStream'
import { BATCH_EXCEL_URL, BATCH_URL, type BatchError, type BatchResult, type BatchStep, type BatchStreamEvents } from './types'

export type BatchRunStatus = 'idle' | 'running' | 'done' | 'error'

export interface BatchRunState {
  status: BatchRunStatus
  step: BatchStep | null
  label: string
  percent: number
  /** Problems per row, as they are found. */
  rowErrors: Array<BatchError & { step: BatchStep }>
  result: BatchResult | null
  /** Whole-run failure (not signed in, partner not found, stream cut off…). */
  error: string | null
}

const IDLE: BatchRunState = { status: 'idle', step: null, label: '', percent: 0, rowErrors: [], result: null, error: null }

type Frame = { [K in keyof BatchStreamEvents]: { event: K; data: BatchStreamEvents[K] } }[keyof BatchStreamEvents]

const EVENTS: ReadonlySet<string> = new Set<keyof BatchStreamEvents>(['started', 'step', 'row-error', 'done', 'failure'])

/** One stream frame folded into the run's state. */
function reduce(state: BatchRunState, frame: Frame): BatchRunState {
  switch (frame.event) {
    case 'started':
      return { ...state, label: 'Starting' }
    case 'step':
      return { ...state, step: frame.data.step, label: frame.data.label, percent: frame.data.percent }
    case 'row-error':
      return { ...state, rowErrors: [...state.rowErrors, frame.data] }
    case 'done':
      return { ...state, status: 'done', percent: 100, result: frame.data }
    case 'failure':
      return { ...state, status: 'error', error: frame.data.message }
  }
}

export interface BatchPayload {
  partnerId: number
  submit: boolean
  entries: Array<Record<string, unknown>>
}

/**
 * Raises payment requests in a batch and follows how far the server got (`POST …/batch` and `…/batch/excel` stream
 * Server-Sent Events). Starting again, `cancel`, or unmounting stops listening; what the server already did stays done.
 */
export function useBatchStream() {
  const dispatch = useAppDispatch()
  const [state, setState] = useState<BatchRunState>(IDLE)
  const controller = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    controller.current?.abort()
    controller.current = null
  }, [])

  const run = useCallback(
    async (path: string, init: { body: BodyInit; headers?: Record<string, string> }) => {
      cancel()
      const abort = new AbortController()
      controller.current = abort
      setState({ ...IDLE, status: 'running', label: 'Starting' })
      try {
        const response = await fetch(`${API_BASE_URL}${path}`, {
          method: 'POST',
          headers: { Accept: 'text/event-stream', ...init.headers },
          credentials: 'include',
          body: init.body,
          signal: abort.signal,
        })
        if (!response.ok || !response.body) {
          const { message } = await streamFailure(response, 'The batch could not be started')
          setState((current) => ({ ...current, status: 'error', error: message }))
          return
        }
        await readSse(response.body, (name, data) => {
          if (!EVENTS.has(name)) return
          setState((current) => reduce(current, { event: name, data } as Frame))
        })
        setState((current) => (current.status === 'running' ? { ...current, status: 'error', error: 'The connection closed early. Check the payment requests list to see what was created.' } : current))
      } catch (error) {
        if (abort.signal.aborted) return
        setState((current) => ({ ...current, status: 'error', error: (error as Error).message || 'The batch could not be started' }))
      } finally {
        if (controller.current === abort) controller.current = null
        // Whatever was created shows up in the list
        dispatch(baseApi.util.invalidateTags(['FinanceRequests']))
      }
    },
    [cancel, dispatch]
  )

  /** The batch form's entries. */
  const startEntries = useCallback((payload: BatchPayload) => run(BATCH_URL, { body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } }), [run])

  /** An uploaded copy of the Excel template. */
  const startFile = useCallback(
    (file: File, partnerId: number, submit: boolean) => {
      const body = new FormData()
      body.append('file', file)
      body.append('partnerId', String(partnerId))
      body.append('submit', String(submit))
      return run(BATCH_EXCEL_URL, { body })
    },
    [run]
  )

  const reset = useCallback(() => {
    cancel()
    setState(IDLE)
  }, [cancel])

  useEffect(() => cancel, [cancel])

  return { ...state, startEntries, startFile, cancel, reset }
}

export type BatchStream = ReturnType<typeof useBatchStream>
