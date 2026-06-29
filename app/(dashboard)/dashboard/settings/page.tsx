'use client'

import React, { useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/design-system/cards'
import { Input } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { Tabs } from '@/design-system/tabs'
import { AmazonAccountAuthorization } from '@/features/amazon/AmazonAccountAuthorization'
import { AccountsList } from '@/features/accounts/AccountsList'
import { AmazonAccountsOverview } from '@/features/amazon/AmazonAccountsOverview'

/**
 * Settings Page - Professional Sellerboard-style design
 * 
 * Manages user account settings and Amazon account connections
 */
export default function SettingsDashboardPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams?.get('tab') || 'account'

  const handleTabChange = useCallback((tabId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('tab', tabId)
    router.push(`/dashboard/settings?${params.toString()}`)
  }, [searchParams, router])

  const tabs = [
    { id: 'account', label: 'Account' },
    { id: 'amazon', label: 'Amazon Accounts' },
  ]

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Settings"
        description="Manage your account settings and connected services"
      />

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-1">
        <Tabs
          items={tabs}
          activeTab={activeTab}
          onChange={handleTabChange}
          className="mb-0"
        />
      </div>

      {activeTab === 'account' && (
        <div className="space-y-6">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900">Account Settings</CardTitle>
                  <CardDescription className="mt-1">
                    Update your personal information and account preferences
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-5 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name
                    </label>
                    <Input
                      type="text"
                      defaultValue="John Doe"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      defaultValue="user@example.com"
                      className="w-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter your company name"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option>UTC (Coordinated Universal Time)</option>
                    <option>America/New_York (EST)</option>
                    <option>America/Los_Angeles (PST)</option>
                    <option>Europe/London (GMT)</option>
                    <option>Europe/Berlin (CET)</option>
                  </select>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <Button variant="primary" size="lg" className="min-w-[140px]">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings Card */}
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-900">Security</CardTitle>
                  <CardDescription className="mt-1">
                    Manage your password and security settings
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-5 max-w-2xl">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Current Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Enter your current password"
                    className="w-full"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      New Password
                    </label>
                    <Input
                      type="password"
                      placeholder="Enter new password"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <Button variant="outline" size="lg" className="min-w-[140px]">
                    Update Password
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'amazon' && (
        <div className="space-y-6">
          {/* Overview Statistics */}
          <AmazonAccountsOverview />

          {/* Connect New Account */}
          <AmazonAccountAuthorization />

          {/* Connected Accounts List */}
          <AccountsList />
        </div>
      )}
    </div>
  )
}
