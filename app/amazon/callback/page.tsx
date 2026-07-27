'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function AmazonCallbackPage() {
  const searchParams = useSearchParams()

  useEffect(() => {
    console.log('[CALLBACK] Page mounted, reading query params...')

    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const message = searchParams.get('message')

    console.log('[CALLBACK] Params:', { success, error, message })

    const payload = {
      type: 'AMAZON_AUTH_CALLBACK',
      success: success === 'true',
      error: error || null,
      message: message || null,
    }

    // 1. window.opener
    if (window.opener && window.opener !== window) {
      console.log('[CALLBACK] window.opener exists, posting message...')
      try {
        window.opener.postMessage(payload, window.location.origin)
        console.log('[CALLBACK] postMessage sent successfully')
      } catch (e) {
        console.log('[CALLBACK] postMessage failed:', e)
      }
    } else {
      console.log('[CALLBACK] window.opener is null or same as window')
    }

    // 2. BroadcastChannel
    try {
      const bc = new BroadcastChannel('amazon_auth')
      console.log('[CALLBACK] BroadcastChannel created, posting...')
      bc.postMessage(payload)
      bc.close()
      console.log('[CALLBACK] BroadcastChannel message sent and closed')
    } catch (e) {
      console.log('[CALLBACK] BroadcastChannel failed:', e)
    }

    // 3. localStorage
    try {
      localStorage.setItem(
        'amazon_auth_callback',
        JSON.stringify({ ...payload, timestamp: Date.now() })
      )
      console.log('[CALLBACK] localStorage set successfully')
    } catch (e) {
      console.log('[CALLBACK] localStorage failed:', e)
    }

    console.log('[CALLBACK] Scheduling window.close in 1200ms...')
    const timer = setTimeout(() => {
      console.log('[CALLBACK] Closing window now')
      window.close()
    }, 1200)

    return () => clearTimeout(timer)
  }, [searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="text-center space-y-4">
        <p className="text-zinc-500 dark:text-zinc-400">Completing authentication...</p>
      </div>
    </div>
  )
}