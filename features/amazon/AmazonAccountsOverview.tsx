'use client'

import React from 'react'
import { useGetAmazonAccountsQuery } from '@/services/api/accounts.api'
import { Card, CardContent } from '@/design-system/cards'
import { Spinner } from '@/design-system/loaders'
import { Badge } from '@/design-system/badges'

/**
 * Amazon Accounts Overview Component
 * 
 * Displays statistics and overview of connected Amazon accounts
 */
export const AmazonAccountsOverview: React.FC = () => {
  const { data: accounts, isLoading } = useGetAmazonAccountsQuery()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <Spinner size="sm" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const totalAccounts = accounts?.length || 0
  const activeAccounts = accounts?.filter((acc) => acc.isActive).length || 0
  const marketplaces = new Set(accounts?.map((acc) => acc.marketplace) || []).size
  const recentConnections = accounts?.filter((acc) => {
    const daysSinceConnection = Math.floor(
      (Date.now() - new Date(acc.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    return daysSinceConnection <= 30
  }).length || 0

  const stats = [
    {
      label: 'Total Accounts',
      value: totalAccounts,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      color: 'bg-blue-100 text-blue-600',
      bgGradient: 'from-blue-50 to-blue-100',
    },
    {
      label: 'Active Accounts',
      value: activeAccounts,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-green-100 text-green-600',
      bgGradient: 'from-green-50 to-green-100',
    },
    {
      label: 'Marketplaces',
      value: marketplaces,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 002 2h2.945M15 11a3 3 0 11-6 0m6 0a3 3 0 10-6 0m6 0h1.055M21 11a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-purple-100 text-purple-600',
      bgGradient: 'from-purple-50 to-purple-100',
    },
    {
      label: 'Recent (30 days)',
      value: recentConnections,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-orange-100 text-orange-600',
      bgGradient: 'from-orange-50 to-orange-100',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
        >
          <CardContent className="p-0">
            <div className={`bg-gradient-to-br ${stat.bgGradient} p-6`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-lg ${stat.color}`}>
                  {stat.icon}
                </div>
                {index === 1 && activeAccounts > 0 && (
                  <Badge variant="success" className="text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
                    Healthy
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
