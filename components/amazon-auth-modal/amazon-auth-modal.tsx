'use client'

import AmazonIcon from '@/components/icons/amazon'
import { Button } from '@/design-system/buttons'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/store/store'
import { useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/ui.slice'

interface AmazonAuthModalProps {
  isOpen: boolean
  onSuccess: () => void
  onPopupOpened?: () => void // ← add this
}

export function AmazonAuthModal({ isOpen, onSuccess, onPopupOpened }: AmazonAuthModalProps) {
  const [loading, setLoading] = useState(false)
  const accessToken = useSelector((state: RootState) => state.auth.accessToken)
  const dispatch = useAppDispatch()

  if (!isOpen) return null

  const handleLogin = async () => {
    console.log('[MODAL] handleLogin called')

    if (!accessToken) {
      dispatch(addNotification({
        message: 'Not authenticated. Please log in first.',
        type: 'error',
      }))
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/amazon/login', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Failed to get auth URL: ${res.status}`)
      }

      const { url } = await res.json()
      if (!url) throw new Error('No authorization URL returned')

      const width = 500
      const height = 600
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2

      // ✅ Clear any stale data from previous attempts
      localStorage.removeItem('amazon_auth_callback')
      console.log('[MODAL] Cleared stale localStorage')

      const popup = window.open(
        url,
        'AmazonAuth',
        `width=${width},height=${height},left=${left},top=${top},popup=1`
      )

      if (!popup) {
        dispatch(addNotification({
          message: 'Popup blocked. Please allow popups.',
          type: 'error',
        }))
        setLoading(false)
        return
      }

      // ✅ Tell parent to hide the modal overlay so toast is visible
      onPopupOpened?.()
      console.log('[MODAL] Popup opened, told parent to hide overlay')

      let handled = false

      const finish = (data: any, source: string) => {
        if (handled) {
          console.log(`[MODAL] finish() called from ${source} but already handled`)
          return
        }
        handled = true
        console.log(`[MODAL] finish() called from ${source}`, data)

        clearInterval(pollInterval)
        clearInterval(checkClosed)
        window.removeEventListener('message', onMessage)
        try {
          const bc = new BroadcastChannel('amazon_auth')
          bc.close()
        } catch {}

        if (data.success) {
          console.log('[MODAL] Success')
          dispatch(addNotification({
            message: 'Amazon account connected successfully.',
            type: 'success',
          }))
          onSuccess()
        } else {
          const errorCode = data.error
          const msg = data.message || 'Authentication failed'
          console.log('[MODAL] Error:', errorCode, msg)

          switch (errorCode) {
            case 'NOT_INVITED':
              dispatch(addNotification({
                message: `Access Denied: ${msg}`,
                type: 'error',
              }))
              break
            case 'INVALID_STATE':
              dispatch(addNotification({
                message: `Security Error: ${msg}`,
                type: 'error',
              }))
              break
            default:
              dispatch(addNotification({
                message: `Authentication Failed: ${msg}`,
                type: 'error',
              }))
          }
        }

        setLoading(false)
      }

      // Channel 1: postMessage
      const onMessage = (event: MessageEvent) => {
        console.log('[MODAL] postMessage received:', event.data)
        if (event.origin !== window.location.origin) return
        if (event.data?.type !== 'AMAZON_AUTH_CALLBACK') return
        finish(event.data, 'postMessage')
      }
      window.addEventListener('message', onMessage)

      // Channel 2: BroadcastChannel
      try {
        const bc = new BroadcastChannel('amazon_auth')
        bc.onmessage = (event) => {
          console.log('[MODAL] BroadcastChannel received:', event.data)
          if (event.data?.type === 'AMAZON_AUTH_CALLBACK') {
            finish(event.data, 'BroadcastChannel')
          }
        }
      } catch {}

      // Channel 3: Aggressive polling (primary mechanism)
      const pollInterval = setInterval(() => {
        const raw = localStorage.getItem('amazon_auth_callback')
        if (!raw) return

        try {
          const data = JSON.parse(raw)
          console.log('[MODAL] Poll found data, age:', Date.now() - data.timestamp, 'ms')
          if (Date.now() - data.timestamp < 60000) {
            localStorage.removeItem('amazon_auth_callback')
            finish(data, 'poll')
          }
        } catch (e) {
          console.log('[MODAL] Poll parse error:', e)
        }
      }, 100)

      // Detect popup close
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          console.log('[MODAL] Popup closed')
          clearInterval(checkClosed)

          // Keep polling for 3 more seconds in case data arrives late
          setTimeout(() => {
            if (!handled) {
              console.log('[MODAL] Timeout: no data received')
              clearInterval(pollInterval)
              setLoading(false)
            }
          }, 3000)
        }
      }, 500)
    } catch (err: any) {
      console.log('[MODAL] Error:', err)
      dispatch(addNotification({
        message: err.message || 'Failed to start Amazon login.',
        type: 'error',
      }))
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 p-8 shadow-xl border border-zinc-200 dark:border-zinc-800">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Connect Amazon Advertising
        </h2>
        <p className="text-zinc-500 dark:text-zinc-400">
          Login with your Amazon account to manage campaigns
        </p>
      </div>

      <div className="mt-8">
        <Button
          onClick={handleLogin}
          disabled={loading}
          size="lg"
          className="bg-[#FF9900] text-black hover:bg-[#FF9900]/90 border-transparent dark:bg-[#FF9900] dark:text-black dark:hover:bg-[#FF9900]/80 w-full h-12 text-lg font-semibold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <AmazonIcon />
              Continue with Amazon
            </>
          )}
        </Button>
      </div>
    </div>
  )
}