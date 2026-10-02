import { useCallback } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/ui.slice'

/** The message an RTK Query error carries (`{ error }` from the API), or the fallback. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { data?: { error?: string; message?: string } } | undefined)?.data
  return data?.error || data?.message || fallback
}

/** Toast helpers so screens do not repeat the dispatch boilerplate. */
export function useApiFeedback() {
  const dispatch = useAppDispatch()
  const success = useCallback((message: string) => dispatch(addNotification({ message, type: 'success' })), [dispatch])
  const failure = useCallback((error: unknown, fallback: string) => dispatch(addNotification({ message: apiErrorMessage(error, fallback), type: 'error' })), [dispatch])
  /** Neutral heads-up, e.g. "someone else just approved this". */
  const info = useCallback((message: string) => dispatch(addNotification({ message, type: 'info' })), [dispatch])
  return { success, failure, info }
}
