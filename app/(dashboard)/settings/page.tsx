'use client'

import React, { useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/design-system/cards'
import { Input } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { Tabs } from '@/design-system/tabs'
import { AmazonAccountAuthorization } from '@/features/amazon/AmazonAccountAuthorization'
import { AccountsList } from '@/features/accounts/AccountsList'

/**
 * Settings page
 * 
 * Manages user account settings and Amazon account connections
 */
export default function SettingsPage() {
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
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account settings and connected services"
      />

      <Tabs
        items={tabs}
        activeTab={activeTab}
        onChange={handleTabChange}
        className="mb-6"
      />

      {activeTab === 'account' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Update your account information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-w-md">
                <Input label="Email" type="email" defaultValue="user@example.com" />
                <Input label="Name" type="text" defaultValue="John Doe" />
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'amazon' && (
        <div className="space-y-6">
          {/* Amazon Account Authorization */}
          <AmazonAccountAuthorization />

          {/* Connected Amazon Accounts List */}
          <AccountsList />
        </div>
      )}
    </div>
  )
}

