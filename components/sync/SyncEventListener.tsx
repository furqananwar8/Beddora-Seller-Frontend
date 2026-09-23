'use client'

import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { addNotification } from '@/store/ui.slice'

export const SyncEventListener: React.FC = () => {
  const dispatch = useAppDispatch()
  
  // Ensure token key matches your Redux Auth state (e.g. state.auth.token or state.auth.accessToken)
  const token = useAppSelector((state: any) => state.auth?.token || state.auth?.accessToken)

  useEffect(() => {
    // If auth token is missing, log warning
    if (!token) {
      console.warn('⚠️ [SSE] No auth token found in Redux. Waiting for user login...')
      return
    }

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5100'
    const sseUrl = `${apiBaseUrl}/api/inventory/events?token=${token}`

    console.log('🔌 [SSE] Attempting connection to:', sseUrl)
    const eventSource = new EventSource(sseUrl)

    eventSource.onopen = () => {
      console.log('✅ [SSE STREAM CONNECTED] Successfully connected to Express SSE stream!')
    }

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        console.log('📩 [SSE MESSAGE RECEIVED]:', payload)

        if (payload.type === 'connected') return

        if (payload.message && payload.toastType) {
          dispatch(
            addNotification({
              message: payload.message,
              type: payload.toastType,
            })
          )
        }
      } catch (error) {
        console.error('❌ [SSE] Error parsing SSE event payload:', error)
      }
    }

    eventSource.onerror = (err) => {
      console.error('⚠️ [SSE STREAM ERROR] Connection dropped or blocked:', err)
    }

    return () => {
      eventSource.close()
    }
  }, [dispatch, token])

  return null
}