'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useVerifyEmailQuery } from '@/services/api/auth.api'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'

/**
 * Email verification component
 * Verifies email using token from URL
 */
export const EmailVerification: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading, error: queryError } = useVerifyEmailQuery(
    { token: token || '' },
    { skip: !token }
  )

  useEffect(() => {
    if (data) {
      setVerified(true)
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    }
    if (queryError) {
      setError('Invalid or expired verification token')
    }
  }, [data, queryError, router])

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-secondary-600 mb-2">
            We&apos;ve sent a verification link to your email address.
          </p>
          <p className="text-secondary-600 mb-4">
            Please open the email and click the verification link to activate your account.
          </p>
          <Button onClick={() => router.push('/login')}>Back to Login</Button>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verifying Email</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  if (verified) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Verified</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-success-600 mb-4">Your email has been verified successfully!</p>
          <p className="text-sm text-secondary-600">Redirecting to login...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verification Failed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-error-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/login')}>Go to Login</Button>
        </CardContent>
      </Card>
    )
  }

  return null
}
