'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useResetPasswordMutation } from '@/services/api/auth.api'
import { Input } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'

/**
 * Reset password form component
 */
export const ResetPasswordForm: React.FC = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [resetPassword, { isLoading, isSuccess }] = useResetPasswordMutation()
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!token) {
      setError('Invalid reset token')
      return
    }

    try {
      await resetPassword({ token, password: formData.password }).unwrap()
    } catch (err: any) {
      setError(err.data?.message || err.message || 'Failed to reset password')
    }
  }

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invalid Reset Link</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-error-600">No reset token provided.</p>
        </CardContent>
      </Card>
    )
  }

  if (isSuccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Password Reset Successful</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-success-600 mb-4">Your password has been reset successfully!</p>
          <Button onClick={() => router.push('/login')}>Go to Login</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="password"
        label="New Password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
        helperText="Must be at least 8 characters with uppercase, lowercase, and number"
      />

      <Input
        type="password"
        label="Confirm Password"
        value={formData.confirmPassword}
        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
        required
      />

      {error && (
        <div className="text-sm text-error-600 bg-error-50 p-3 rounded">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" isLoading={isLoading}>
        Reset Password
      </Button>
    </form>
  )
}
