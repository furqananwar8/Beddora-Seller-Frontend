'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLogoutMutation } from '@/services/api/auth.api'
import { Input } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { addNotification } from '@/store/ui.slice'
import { clearCredentials } from '@/store/auth.slice'
import { Spinner } from '@/design-system/loaders'
import { useChangePasswordMutation } from '@/services/api/users.api'

const INITIAL_FORM_STATE = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

export default function GeneralSettingsPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  
  // Retrieve refreshToken from state to pass to the logout API
  const refreshToken = useAppSelector((state) => state.auth.refreshToken)

  const [activeTab, setActiveTab] = useState<'security' | 'general'>('security')
  const [formData, setFormData] = useState(INITIAL_FORM_STATE)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation()
  const [logout] = useLogoutMutation()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.newPassword !== formData.confirmPassword) {
      dispatch(
        addNotification({
          message: 'New password and confirm password do not match.',
          type: 'error',
        })
      )
      return
    }

    if (formData.newPassword.length < 8) {
      dispatch(
        addNotification({
          message: 'New password must be at least 8 characters long.',
          type: 'error',
        })
      )
      return
    }

    try {
      // 1. Send password update request
      const response = await changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      }).unwrap()

      // 2. Display success toast notification
      dispatch(
        addNotification({
          message: response.message || 'Password updated successfully! Logging out...',
          type: 'success',
        })
      )

      setFormData(INITIAL_FORM_STATE)

      // 3. Wait 0.5s for user to see the success toast, then trigger logout flow
      setTimeout(async () => {
        setIsLoggingOut(true)
        try {
          await logout(refreshToken ? { refreshToken } : undefined).unwrap()
        } catch (logoutErr) {
          console.error('Logout error after password change:', logoutErr)
        } finally {
          // Clear credentials from Redux store & navigate to login
          dispatch(clearCredentials())
          router.push('/login')
        }
      }, 500)

    } catch (err: any) {
      const errorMessage =
        err.data?.message || err.data?.error || err.message || 'Failed to update password.'

      dispatch(
        addNotification({
          message: errorMessage,
          type: 'error',
        })
      )
    }
  }

  // Show full-page spinner overlay while completing the logout transition
  if (isLoggingOut) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
        <Spinner />
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Password updated successfully. Logging out...
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">General Settings</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage your account credentials and system preferences.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 mb-8">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'security'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:hover:text-zinc-300'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            Security & Password
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'general'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:hover:text-zinc-300'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            Profile Info
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'security' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Update Password
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Ensure your account is using a long, random password to stay secure.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-5 max-w-md">
            <Input
              type="password"
              name="currentPassword"
              label="Current Password"
              placeholder="••••••••"
              value={formData.currentPassword}
              onChange={handleChange}
              disabled={isChangingPassword}
              required
            />

            <Input
              type="password"
              name="newPassword"
              label="New Password"
              placeholder="••••••••"
              value={formData.newPassword}
              onChange={handleChange}
              disabled={isChangingPassword}
              required
            />

            <Input
              type="password"
              name="confirmPassword"
              label="Confirm New Password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={isChangingPassword}
              required
            />

            <div className="pt-2">
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? <Spinner /> : 'Update Password'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'general' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 md:p-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
            Profile Information
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            This tab is ready for future general user profile settings.
          </p>
        </div>
      )}
    </div>
  )
}