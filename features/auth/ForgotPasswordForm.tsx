'use client'

import React, { useState } from 'react'
import { useForgotPasswordMutation } from '@/services/api/auth.api'
import { Input } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import Link from 'next/link'

/**
 * Forgot password form component
 */
export const ForgotPasswordForm: React.FC = () => {
  const [forgotPassword, { isLoading, isSuccess }] = useForgotPasswordMutation()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      await forgotPassword({ email }).unwrap()
    } catch (err: any) {
      setError(err.data?.message || err.message || 'Failed to send reset email')
    }
  }

  if (isSuccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check Your Email</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-secondary-600 mb-4">
            If an account exists with that email, a password reset link has been sent.
          </p>
          <Link href="/login">
            <Button variant="outline">Back to Login</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="email"
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        helperText="Enter your email address and we'll send you a reset link"
      />

      {error && (
        <div className="text-sm text-error-600 bg-error-50 p-3 rounded">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" isLoading={isLoading}>
        Send Reset Link
      </Button>

      <p className="text-center text-sm text-secondary-600">
        Remember your password?{' '}
        <Link href="/login" className="text-primary-600 hover:text-primary-700">
          Sign in
        </Link>
      </p>
    </form>
  )
}
