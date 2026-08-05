'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLoginMutation } from '@/services/api/auth.api'
import { useAppDispatch } from '@/store/hooks'
import { setCredentials } from '@/store/auth.slice'
import { setPermissions } from '@/store/permissions.slice'
import { Input } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { getRedirectRoute } from '@/lib/route-permissions'
import Link from 'next/link'

/**
 * Login form component
 */
export const LoginForm: React.FC = () => {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const [login, { isLoading }] = useLoginMutation()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const result = await login(formData).unwrap()

      // 1. Save auth credentials
      dispatch(
        setCredentials({
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          accountId: result.accountId,
        })
      )

      // 2. Save permissions and redirect to first allowed route
      if (result.permissions && result.permissions.length > 0) {
        dispatch(setPermissions(result.permissions as any))
        const redirectTo = getRedirectRoute(result.permissions as any)
        router.push(redirectTo)
        return
      }

      // Fallback
      router.push('/dashboard/profit/dashboard')
    } catch (err: any) {
      setError(err.data?.message || err.message || 'Login failed. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="email"
        label="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />

      <Input
        type="password"
        label="Password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
      />

      {error && (
        <div className="text-sm text-error-600 bg-error-50 p-3 rounded">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Link href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
          Forgot password?
        </Link>
      </div>

      <Button type="submit" className="w-full" isLoading={isLoading}>
        Sign in
      </Button>

      <p className="text-center text-sm text-secondary-600">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-primary-600 hover:text-primary-700">
          Sign up
        </Link>
      </p>
    </form>
  )
}