'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { useRegister } from './useRegister'
import { TermsCheckbox } from './TermsCheckbox'

/**
 * Registration form component
 * Includes Terms & Privacy policy acceptance
 */
export const RegisterForm: React.FC = () => {
  const router = useRouter()
  const { submit, isLoading } = useRegister()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    acceptTerms: false,
    acceptPrivacy: false,
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // Client-side validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!formData.acceptTerms || !formData.acceptPrivacy) {
      setError('You must accept Terms & Conditions and Privacy Policy')
      return
    }

    try {
      await submit({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        acceptTerms: formData.acceptTerms,
        acceptPrivacy: formData.acceptPrivacy,
      })
      setSuccess('Registration successful. Check your email to verify your account.')
      router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`)
    } catch (err: any) {
      setError(err.data?.message || err.message || 'Registration failed. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="text"
        label="Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />

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
        helperText="Min 8 chars with uppercase, lowercase, number, and special character"
      />

      <Input
        type="password"
        label="Confirm Password"
        value={formData.confirmPassword}
        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
        required
      />

      <div className="space-y-2">
        <TermsCheckbox
          checked={formData.acceptTerms}
          onChange={(checked) => setFormData({ ...formData, acceptTerms: checked })}
          label="terms"
        />
        <TermsCheckbox
          checked={formData.acceptPrivacy}
          onChange={(checked) => setFormData({ ...formData, acceptPrivacy: checked })}
          label="privacy"
        />
      </div>

      {error && (
        <div className="text-sm text-error-600 bg-error-50 p-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="text-sm text-success-700 bg-success-50 p-3 rounded">
          {success}
        </div>
      )}

      <Button type="submit" className="w-full" isLoading={isLoading}>
        Sign up
      </Button>

      <p className="text-center text-sm text-secondary-600">
        Already have an account?{' '}
        <Link href="/login" className="text-primary-600 hover:text-primary-700">
          Sign in
        </Link>
      </p>
    </form>
  )
}
