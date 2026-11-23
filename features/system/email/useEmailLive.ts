'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRealtime } from '@/components/realtime/RealtimeProvider'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { emailTags, systemEmailApi, type EmailListParams, type EmailLiveEvent } from '@/services/api/systemEmail.api'
import { useAppDispatch } from '@/store/hooks'
import { belongsToList } from './emailMeta'

/** How long a changed row stays highlighted. */
const FLASH_MS = 2000
/** A burst of events becomes one toast, and one refresh of the counts, once it has been quiet this long. */
const QUIET_MS = 1500

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

interface Burst {
  sent: number
  failed: number
  last: EmailLiveEvent | null
}

/**
 * Keeps the Email screen current while it is open, from the realtime topic `system.email`: the changed row is patched in
 * the cached list (no refetch) or leaves it when it no longer fits the tab and filters, the open history refetches,
 * the counts refresh once per burst, and a toast says what happened (many at once become one summary).
 * Returns the ids of rows that just changed, to highlight. Must be rendered inside `RealtimeProvider`.
 * shortcut: events missed while the connection was down are not caught up; reloading the screen does.
 */
export function useEmailLive(list: EmailListParams): ReadonlySet<number> {
  const dispatch = useAppDispatch()
  const { success, error } = useApiFeedback()
  const [flashIds, setFlashIds] = useState<ReadonlySet<number>>(new Set())
  const current = useRef(list)
  current.current = list
  const burst = useRef<Burst>({ sent: 0, failed: 0, last: null })
  const quietTimer = useRef<ReturnType<typeof setTimeout>>()
  const flashTimers = useRef(new Set<ReturnType<typeof setTimeout>>())

  useEffect(() => {
    const timers = flashTimers.current
    return () => {
      clearTimeout(quietTimer.current)
      timers.forEach(clearTimeout)
    }
  }, [])

  const flash = useCallback((id: number) => {
    setFlashIds((ids) => new Set(ids).add(id))
    const timer = setTimeout(() => {
      flashTimers.current.delete(timer)
      setFlashIds((ids) => {
        const next = new Set(ids)
        next.delete(id)
        return next
      })
    }, FLASH_MS)
    flashTimers.current.add(timer)
  }, [])

  /** The cached list of the screen's current tab and filters takes the change. */
  const patchList = useCallback(
    ({ trigger: _trigger, ...row }: EmailLiveEvent) => {
      const params = current.current
      dispatch(
        systemEmailApi.util.updateQueryData('getEmails', params, (draft) => {
          const at = draft.data.findIndex((item) => item.id === row.id)
          const fits = belongsToList(row, params)
          if (at >= 0 && fits) draft.data[at] = row
          else if (at >= 0) {
            draft.data.splice(at, 1)
            draft.totalRecords -= 1
          } else if (fits && params.page === 1) {
            // A new email lands at the top of the first page, which keeps its size
            draft.data.unshift(row)
            draft.data.splice(params.limit)
            draft.totalRecords += 1
          }
        })
      )
    },
    [dispatch]
  )

  /** One toast for what came in during the burst, then the counts refresh once. */
  const settle = useCallback(() => {
    const { sent, failed, last } = burst.current
    burst.current = { sent: 0, failed: 0, last: null }
    dispatch(systemEmailApi.util.invalidateTags([emailTags.summary, emailTags.backlog]))
    if (sent + failed === 0 || !last) return
    if (sent + failed === 1) {
      if (failed) error(`Email failed · ${last.subject} · ${last.lastError ?? 'could not be sent'}`)
      else success(`Email sent · ${last.subject}, to ${last.toAddress}`)
      return
    }
    const summary = [sent && `${plural(sent, 'email')} sent`, failed && `${failed} failed`].filter(Boolean).join(', ')
    if (failed) error(summary)
    else success(summary)
  }, [dispatch, error, success])

  useRealtime('system.email', (message) => {
    const event = message.data as unknown as EmailLiveEvent
    patchList(event)
    flash(event.id)
    dispatch(systemEmailApi.util.invalidateTags([emailTags.history(event.id)]))

    if (message.type === 'sent') burst.current.sent += 1
    else if (message.type === 'failed') burst.current.failed += 1
    if (message.type !== 'queued') burst.current.last = event
    clearTimeout(quietTimer.current)
    quietTimer.current = setTimeout(settle, QUIET_MS)
  })

  return flashIds
}
