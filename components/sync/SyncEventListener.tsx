'use client'

import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { addNotification } from '@/store/ui.slice'

export const SyncEventListener: React.FC = () => {
  const dispatch = useAppDispatch()
  
  const reduxToken = useAppSelector((state: any) => state.auth?.token || state.auth?.accessToken)

  useEffect(() => {
    const token =
      reduxToken ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('token') || localStorage.getItem('accessToken')
        : null)

    if (!token) {
      console.warn('⚠️ [SSE] No JWT token found in Redux or localStorage. Waiting...')
      return
    }

    const apiBaseUrl = process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || 'http://localhost:3001'
    const sseUrl = `${apiBaseUrl}/api/inventory/events?token=${token}`

    console.log('🔌 [SSE] Mounting listener. Connecting to:', sseUrl)
    const eventSource = new EventSource(sseUrl)

    eventSource.onopen = () => {
      console.log('✅ [SSE STREAM CONNECTED] Express SSE listener active!')
    }

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        console.log('📩 [SSE EVENT RECEIVED]:', payload)

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
        console.error('❌ [SSE] Payload parse error:', error)
      }
    }

    eventSource.onerror = (err) => {
      if (eventSource.readyState === EventSource.CONNECTING) {
        console.warn('⚠️ [SSE] Reconnecting to backend...')
      } else {
        console.error('⚠️ [SSE STREAM ERROR] Connection dropped or blocked:', err)
      }
    }

    return () => {
      eventSource.close()
    }
  }, [dispatch, reduxToken])

  return null
}