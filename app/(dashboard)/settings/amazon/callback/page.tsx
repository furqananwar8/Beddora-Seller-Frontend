'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/design-system/cards'
import { Spinner } from '@/design-system/loaders'
import { Alert } from '@/design-system/alerts'
import { Button } from '@/design-system/buttons'

/**
 * OAuth Callback Page
 * 
 * Handles the redirect from Amazon after user authorizes the application.
 * 
 * Flow:
 * 1. User authorizes on Amazon
 * 2. Amazon redirects here with ?code=AUTH_CODE&state=STATE_TOKEN
 * 3. Backend exchanges code for refresh token
 * 4. User is redirected to settings page
 * 
 * Security:
 * - State token is validated server-side
 * - Authorization code is exchanged server-side
 * - No tokens are exposed to frontend
 */
export default function AmazonOAuthCallbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState<string>('Processing authorization...')

  useEffect(() => {
    const code = searchParams?.get('code')
    const state = searchParams?.get('state')
    const error = searchParams?.get('error')
    const errorDescription = searchParams?.get('error_description')

    // Handle OAuth error from Amazon
    if (error) {
      setStatus('error')
      setMessage(
        errorDescription || error === 'access_denied'
          ? 'Authorization was cancelled or denied. Please try again.'
          : `Authorization failed: ${error}`
      )
      return
    }

    // Validate required parameters
    if (!code || !state) {
      setStatus('error')
      setMessage('Invalid authorization response. Missing code or state parameter.')
      return
    }

    // Call backend to handle OAuth callback
    const handleCallback = async () => {
      try {
        // Use the same base URL as RTK Query
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5200/api'
        const response = await fetch(
          `${API_BASE_URL}/amazon/oauth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
          {
            method: 'GET',
            credentials: 'include', // Include cookies for authentication
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || data.message || 'Authorization failed')
        }

        // Success
        setStatus('success')
        setMessage('Amazon account connected successfully! Redirecting...')

        // Redirect to settings page after 2 seconds
        setTimeout(() => {
          router.push('/dashboard/settings?tab=amazon')
        }, 2000)
      } catch (err: any) {
        setStatus('error')
        setMessage(err.message || 'Failed to complete authorization. Please try again.')
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            {status === 'processing' && (
              <>
                <Spinner size="lg" className="mx-auto" />
                <h2 className="text-xl font-semibold text-gray-900">Processing Authorization</h2>
                <p className="text-gray-600">{message}</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Success!</h2>
                <p className="text-gray-600">{message}</p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Authorization Failed</h2>
                <Alert variant="danger" className="mt-4">
                  {message}
                </Alert>
                <div className="pt-4">
                  <Button
                    variant="primary"
                    onClick={() => router.push('/dashboard/settings?tab=amazon')}
                  >
                    Go to Settings
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
