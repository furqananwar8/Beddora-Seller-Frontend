'use client'

import { useEffect } from 'react'
import { useRealtime } from '@/components/realtime/RealtimeProvider'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { addNotification } from '@/store/ui.slice'
import type { UploadEvent } from './uploadQueue'
import { uploadStore, applyEvent } from './uploadStore'

/**
 * Keeps the upload list true wherever the user is in the app, including right after a reload: it fetches the server's list of the user's
 * uploads on load (and when the page comes back to the foreground), folds in the upload stream (`procurement.container-upload`, addressed to
 * the uploader, each event carrying the full list), and toasts each background file that finishes or fails. The container's documents list
 * refreshes itself from the `procurement.container` events. Must be rendered inside `RealtimeProvider`.
 */
export const ContainerUploadEventListener: React.FC = () => {
  const dispatch = useAppDispatch()
  const isAuthenticated = useAppSelector((state) => Boolean(state.auth?.user))

  useEffect(
    () =>
      uploadStore.onSettled((item) => {
        dispatch(item.status === 'done' ? addNotification({ type: 'success', message: `${item.name} uploaded` }) : addNotification({ type: 'error', message: `${item.name} could not be uploaded: ${item.error ?? 'try again'}` }))
      }),
    [dispatch]
  )

  useEffect(() => {
    if (!isAuthenticated) return
    void uploadStore.sync()
    const onVisible = () => document.visibilityState === 'visible' && void uploadStore.sync()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [isAuthenticated])

  // The one thing a reload cannot save: a file still travelling from this browser to the server. Files the server already has carry on by themselves.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!uploadStore.hasFilesBeingSent()) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  useRealtime('procurement.container-upload', (message) => applyEvent({ type: message.type, data: message.data } as unknown as UploadEvent))
  return null
}
