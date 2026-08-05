'use client'

import React, { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  useGetInviteByTokenQuery,
  useAcceptInviteByTokenMutation,
} from '@/services/api/invites.api'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner' // adjust path to your spinner
import { Spinner } from '@/design-system/loaders'

export default function AcceptInvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [touched, setTouched] = useState({
    name: false,
    password: false,
    confirmPassword: false,
  })

  const {
    data: invite,
    isLoading: validating,
    error: validateError,
  } = useGetInviteByTokenQuery(token, { skip: !token })

  const [acceptInvite, { isLoading: accepting, error: acceptError }] =
    useAcceptInviteByTokenMutation()

  const validatePassword = (pwd: string): string | null => {
    if (!pwd) return 'Password is required'
    if (pwd.length < 8) return 'Password must be at least 8 characters'
    if (pwd.length > 15) return 'Password must be at most 15 characters'
    if (!/[A-Z]/.test(pwd)) return 'Must contain at least one uppercase letter'
    if (!/[a-z]/.test(pwd)) return 'Must contain at least one lowercase letter'
    if (!/[0-9]/.test(pwd)) return 'Must contain at least one number'
    if (!/[@$!%*?&]/.test(pwd)) return 'Must contain at least one special character (@$!%*?&)'
    return null
  }

  const errors = useMemo(() => {
    const e: { name?: string; password?: string; confirmPassword?: string } = {}
    if (touched.name && !name.trim()) e.name = 'Full name is required'
    if (touched.password) {
      const pwdErr = validatePassword(password)
      if (pwdErr) e.password = pwdErr
    }
    if (touched.confirmPassword) {
      if (!confirmPassword) e.confirmPassword = 'Please confirm your password'
      else if (confirmPassword !== password) e.confirmPassword = 'Passwords do not match'
    }
    return e
  }, [name, password, confirmPassword, touched])

  const isFormValid = useMemo(() => {
    return (
      name.trim().length > 0 &&
      !validatePassword(password) &&
      confirmPassword.length > 0 &&
      confirmPassword === password
    )
  }, [name, password, confirmPassword])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ name: true, password: true, confirmPassword: true })

    if (!isFormValid) return

    try {
      // FIX: send name explicitly as trimmed string (was name || undefined)
      await acceptInvite({ token, password, name: name.trim() }).unwrap()
      setSubmitted(true)
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err: any) {
      // acceptError from RTK Query handles UI message
    }
  }

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Validating your invite...</p>
      </div>
    )
  }

  if (validateError || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-red-600 mb-2">Invalid or Expired Invite</h1>
          <p className="text-gray-500">
            This invite link is no longer valid. Please ask your admin to send a new one.
          </p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Spinner />
          </div>
          <h1 className="text-xl font-semibold text-green-600 mb-2">Account Created!</h1>
          <p className="text-gray-500">Redirecting to login…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Join Beddora</h1>
        <p className="text-sm text-gray-500 mb-6">
          Set your password to activate{' '}
          <span className="font-medium text-gray-700">{invite.email}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              placeholder="John Doe"
              className={`w-full rounded border px-3 py-2 text-sm focus:outline-none ${
                errors.name
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              placeholder="••••••••"
              className={`w-full rounded border px-3 py-2 text-sm focus:outline-none ${
                errors.password
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
            <p className="mt-1 text-xs text-gray-400">
              8–15 chars, 1 uppercase, 1 lowercase, 1 number, 1 special (@$!%*?&)
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
              placeholder="••••••••"
              className={`w-full rounded border px-3 py-2 text-sm focus:outline-none ${
                errors.confirmPassword
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:border-blue-500'
              }`}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          {/* API Error */}
          {acceptError && (
            <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">
              {(acceptError as any)?.data?.message ||
                'Failed to create account. Please try again.'}
            </div>
          )}

          <button
            type="submit"
            disabled={accepting}
            className="w-full rounded bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {accepting ? 'Creating account…' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}