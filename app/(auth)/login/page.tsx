'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLoginMutation } from '@/services/api/auth.api'
import { useAppDispatch } from '@/store/hooks'
import { setCredentials } from '@/store/auth.slice'
import { Button } from '@/design-system/buttons'
import { Logo, PromotionalSection, SocialLoginButton, InputWithIcon } from '@/components/marketing'
import { Footer } from '@/components/layout'
import { marketingFeatures, marketingTestimonial, marketingContent } from '@/components/marketing/marketingData'
import { beddoraFlowSteps } from '@/components/marketing/flowData'

/**
 * Login page with split-screen design
 * Uses reusable marketing components
 */
export default function LoginPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const [login, { isLoading }] = useLoginMutation()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  })
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      const result = await login({ email: formData.email, password: formData.password }).unwrap()
      dispatch(
        setCredentials({
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          accountId: result.accountId,
        })
      )
      router.push('/dashboard/profit/dashboard')
    } catch (err: any) {
      setError(err?.data?.error || 'Login failed. Please try again.')
    }
  }

  const emailIcon = (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )

  const lockIcon = (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  )

  const eyeIcon = showPassword ? (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.97 9.97 0 015.12 5.12m3.07 3.07L12 12m-3.81-3.81L3 3m9 9l3.81 3.81M21 21l-3.81-3.81M21 21l-3.29-3.29m0 0a9.97 9.97 0 01-1.563 3.029M12 12l-3.81-3.81" />
    </svg>
  ) : (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side - Promotional Content with Flow */}
        <PromotionalSection
          logo={<Logo variant="light" />}
          heading={marketingContent.heading}
          subtitle={marketingContent.subtitle}
          features={marketingFeatures}
          testimonial={marketingTestimonial}
          flowSteps={beddoraFlowSteps}
        />

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 bg-surface flex flex-col">
          <div className="flex-1 flex items-center justify-center p-8 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden">
            <Logo variant="dark" />
          </div>

          <div>
            <h2 className="text-3xl lg:text-4xl font-bold text-text-primary mb-3">Welcome back</h2>
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
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="you@company.com"
              required
            />

            {/* Password Input */}
            <InputWithIcon
              type={showPassword ? 'text' : 'password'}
              label="Password"
              leftIcon={lockIcon}
              rightIcon={eyeIcon}
              onRightIconClick={() => setShowPassword(!showPassword)}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              required
            />

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-border rounded focus:ring-primary-200"
                />
                <span className="ml-2 text-sm text-text-secondary">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
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
            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
              Sign in
            </Button>

            {/* Social Login Section - Hidden for now */}
            {/* <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-surface text-text-muted">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SocialLoginButton provider="google" />
              <SocialLoginButton provider="amazon" />
            </div> */}
          </form>

          <div className="pt-4 space-y-4">
            <p className="text-center text-sm text-text-muted">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-primary-600 font-medium hover:text-primary-700 transition-colors">
                Start free trial
              </Link>
            </p>

            <p className="text-center text-xs text-text-muted leading-relaxed">
              By signing in, you agree to our{' '}
              <Link href="/terms" className="text-primary-600 hover:text-primary-700 transition-colors">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary-600 hover:text-primary-700 transition-colors">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
      </div>
    </div>
  )
}
