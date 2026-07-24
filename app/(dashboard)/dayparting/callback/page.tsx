'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function AmazonCallbackPage() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const message = searchParams.get('message')

    if (window.opener && window.opener !== window) {
      window.opener.postMessage(
        {
          type: 'AMAZON_AUTH_CALLBACK',
          success: success === 'true',
          error: error || null,
          message: message ? decodeURIComponent(message) : null,
        },
        window.location.origin
      )
      window.close()
    } else {
      // Not in popup — redirect to dashboard
      window.location.replace('/dashboard')
    }
  }, [searchParams])

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600" />
        <p className="text-zinc-500 dark:text-zinc-400">Completing authentication...</p>
      </div>
    </div>
  )
}