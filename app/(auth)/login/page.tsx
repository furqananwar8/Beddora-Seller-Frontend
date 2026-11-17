'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLoginMutation } from '@/services/api/auth.api'
import { useAppDispatch } from '@/store/hooks'
import { setCredentials } from '@/store/auth.slice'
import { Button } from '@/design-system/buttons'
import { InputWithIcon } from '@/components/marketing'
import { BeddoraBrand } from '@/components/brand/BeddoraBrand'

type LoginPhase = 'idle' | 'authenticating' | 'redirecting'

export default function LoginPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const [login, { isLoading: isLoginLoading }] = useLoginMutation()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  })
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [phase, setPhase] = useState<LoginPhase>('idle')

  const isBusy = phase !== 'idle'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setPhase('authenticating')

    try {
      const result = await login({
        email: formData.email,
        password: formData.password,
      }).unwrap()

      dispatch(
        setCredentials({
          user: result.user,
          accountId: result.accountId,
        })
      )

      setPhase('redirecting')
      router.push('/dashboard/profit/dashboard')
      // Page unmounts here on success — no cleanup needed
    } catch (err: any) {
      setPhase('idle')
      setError(err?.data?.error || 'Login failed. Please try again.')
    }
  }

  // ── Icons ──────────────────────────────────────────────────────────
  const emailIcon = (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  )

  const lockIcon = (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  )

  // Eye = the password is hidden (click to show); eye with a slash = it is showing (click to hide)
  const eyeIcon = showPassword ? (
    <svg fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  ) : (
    <svg fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )

  // ── Redirecting Overlay ────────────────────────────────────────────
  if (phase === 'redirecting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface">
        <div className="mb-8">
          <BeddoraBrand size="xl" align="center" />
        </div>
        <p className="mt-5 text-text-muted text-sm font-medium animate-pulse">
          Loading your dashboard...
        </p>
      </div>
    )
  }

  // ── Main Login UI ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* Login Form */}
        <div className="w-full bg-surface flex flex-col">
          <div className="flex-1 flex items-center justify-center p-8 lg:p-12 overflow-y-auto">
            <div className="w-full max-w-md space-y-8">
              {/* Brand, centred above the form */}
              <div className="flex flex-col items-center gap-4">
                <BeddoraBrand size="xl" align="center" />
                <p className="text-text-muted text-lg">Sign in to your account to continue.</p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Input */}
                <InputWithIcon
                  type="email"
                  label="Email address"
                  leftIcon={emailIcon}
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="you@company.com"
                  required
                  disabled={isBusy}
                />

                {/* Password Input */}
                <InputWithIcon
                  type={showPassword ? 'text' : 'password'}
                  label="Password"
                  leftIcon={lockIcon}
                  rightIcon={eyeIcon}
                  onRightIconClick={() => setShowPassword(!showPassword)}
                  rightIconLabel={showPassword ? 'Hide password' : 'Show password'}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="••••••••"
                  required
                  disabled={isBusy}
                />

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.rememberMe}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          rememberMe: e.target.checked,
                        })
                      }
                      disabled={isBusy}
                      className="w-4 h-4 text-primary-600 border-border rounded focus:ring-primary-200 disabled:opacity-50"
                    />
                    <span className="ml-2 text-sm text-text-secondary">
                      Remember me
                    </span>
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="text-sm text-error-600 bg-error-50 p-3 rounded-lg border border-error-200">
                    {error}
                  </div>
                )}

                {/* Sign In Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  isLoading={isBusy}
                  disabled={isBusy}
                >
                  {phase === 'authenticating' ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>

              <div className="pt-4 space-y-4">
                <p className="text-center text-xs text-text-muted leading-relaxed">
                  By signing in, you agree to our{' '}
                  <Link
                    href="/terms"
                    className="text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link
                    href="/privacy"
                    className="text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}