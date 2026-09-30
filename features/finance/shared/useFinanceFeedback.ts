import { useCallback } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/ui.slice'

/** Shape of an RTK Query error coming back from the finance API. */
export function financeErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { data?: { error?: string; message?: string } } | undefined)?.data
  return data?.error || data?.message || fallback
}

/** Toast helpers so screens do not repeat the dispatch boilerplate. */
export function useFinanceFeedback() {
  const dispatch = useAppDispatch()
  const success = useCallback((message: string) => dispatch(addNotification({ message, type: 'success' })), [dispatch])
  const failure = useCallback((error: unknown, fallback: string) => dispatch(addNotification({ message: financeErrorMessage(error, fallback), type: 'error' })), [dispatch])
  return { success, failure }
}
