'use client'

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { Input, Select } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { Badge } from '@/design-system/badges'
import { Card, CardContent } from '@/design-system/cards'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/design-system/tables'
import { mockAlertSummary, mockAlerts } from './mockAlerts'

type AlertTab = 'all' | 'by-product' | 'by-type' | 'by-priority' | 'by-marketplace'

export const AlertDashboardScreen = React.memo(() => {
  const [alerts] = useState(mockAlerts)
  const [summary] = useState(mockAlertSummary)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<AlertTab>('all')
  const [period, setPeriod] = useState('all')
  const [marketplace, setMarketplace] = useState('all')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')

  const handleMarkAllResolved = () => {
    console.log('Mark all as resolved')
  }

  const handleExport = () => {
    console.log('Export alerts')
  }

  const getMarketplaceFlag = (code: string) => {
    if (code === 'US') return '🇺🇸'
    if (code === 'CA') return '🇨🇦'
    return '🌐'
  }

  const tabs = [
    { id: 'all' as const, label: 'All', icon: '🌐' },
    { id: 'by-product' as const, label: 'By product', icon: '📦' },
    { id: 'by-type' as const, label: 'By type', icon: '📋' },
    { id: 'by-priority' as const, label: 'By priority', icon: '⚠️' },
    { id: 'by-marketplace' as const, label: 'By marketplace', icon: '🏪' },
  ]

  return (
    <Container size="full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Alert Dashboard</h1>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <Input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-border bg-surface hover:bg-surface-secondary transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm">Period</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button className="flex items-center gap-2 px-4 py-2 border border-border bg-surface hover:bg-surface-secondary transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M3 6h18M3 18h18" />
          </svg>
          <span className="text-sm">All marketplaces</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button className="flex items-center gap-2 px-4 py-2 border border-border bg-surface hover:bg-surface-secondary transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span className="text-sm">All types</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button className="flex items-center gap-2 px-4 py-2 border border-border bg-surface hover:bg-surface-secondary transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          <span className="text-sm">All statuses</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button className="flex items-center gap-2 px-4 py-2 border border-border bg-surface hover:bg-surface-secondary transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          <span className="text-sm">Filter</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Major Alerts */}
        <Card className="border-l-4 border-l-red-400 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 22h20L12 2zm0 4l7 14H5l7-14z" />
              </svg>
              <h3 className="font-semibold text-red-900">Major</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-red-700">Unresolved</div>
                <div className="text-2xl font-bold text-red-900">{summary.major.unresolved}</div>
              </div>
              <div>
                <div className="text-sm text-red-700">Resolved</div>
                <div className="text-2xl font-bold text-red-900">{summary.major.resolved}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Minor Alerts */}
        <Card className="border-l-4 border-l-yellow-400 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              <h3 className="font-semibold text-yellow-900">Minor</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-yellow-700">Unresolved</div>
                <div className="text-2xl font-bold text-yellow-900">{summary.minor.unresolved}</div>
              </div>
              <div>
                <div className="text-sm text-yellow-700">Resolved</div>
                <div className="text-2xl font-bold text-yellow-900">{summary.minor.resolved}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total */}
        <Card className="border-l-4 border-l-gray-400 bg-gray-50">
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Total</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-700">Unresolved</div>
                <div className="text-2xl font-bold text-gray-900">{summary.total.unresolved}</div>
              </div>
              <div>
                <div className="text-sm text-gray-700">Resolved</div>
                <div className="text-2xl font-bold text-gray-900">{summary.total.resolved}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Mark All Button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold text-text-primary mr-4">Alerts</span>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={handleMarkAllResolved}
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Mark all as resolved
        </button>
      </div>

      {/* Alerts Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">
                  Date
                  <button className="ml-1 inline-block">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Marketplace</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="text-center">Resolved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell className="whitespace-nowrap">{alert.date}</TableCell>
                  <TableCell className="whitespace-pre-line text-sm">{alert.description}</TableCell>
                  <TableCell>
                    <div className="flex items-start gap-3">
                      <img
                        src={alert.productImage}
                        alt={alert.productTitle}
                        className="w-12 h-12 object-cover rounded border border-border flex-shrink-0"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50"%3E%3Crect width="50" height="50" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="10" fill="%239ca3af"%3EProduct%3C/text%3E%3C/svg%3E'
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-text-muted mb-0.5">{alert.productSku}</div>
                        <div className="text-sm text-text-primary leading-relaxed whitespace-pre-line">
                          {alert.productTitle}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-text-muted">—</TableCell>
                  <TableCell className="text-center">
                    <span className="text-2xl">{getMarketplaceFlag(alert.marketplaceCode)}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={alert.priority === 'major' ? 'error' : 'warning'}>
                      {alert.priority === 'major' ? '⚠️ Major' : 'ℹ️ Minor'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <input type="checkbox" checked={alert.resolved} onChange={() => {}} className="w-4 h-4" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Export Button */}
      <div>
        <Button variant="secondary" onClick={handleExport}>
          Export
        </Button>
      </div>
    </Container>
  )
})

AlertDashboardScreen.displayName = 'AlertDashboardScreen'
