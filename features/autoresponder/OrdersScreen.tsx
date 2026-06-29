'use client'

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { Input, Select } from '@/design-system/inputs'
import { Badge } from '@/design-system/badges'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/design-system/tables'
import { mockAutoresponderOrders } from './mockOrders'

export const OrdersScreen = React.memo(() => {
  const [orders] = useState(mockAutoresponderOrders)
  const [searchTerm, setSearchTerm] = useState('')
  const [orderIdFilter, setOrderIdFilter] = useState('order_id')
  const [campaignFilter, setCampaignFilter] = useState('all')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const filteredOrders = orders.filter((order) =>
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.productTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.productSku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const dateA = new Date(a.orderDate.split('/').reverse().join('-'))
    const dateB = new Date(b.orderDate.split('/').reverse().join('-'))
    return sortDirection === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime()
  })

  const getStatusBadgeVariant = (status: string): 'error' | 'primary' | 'secondary' | 'success' | 'warning' => {
    switch (status) {
      case 'pending_data':
        return 'warning'
      case 'sent':
        return 'success'
      case 'failed':
        return 'error'
      default:
        return 'secondary'
    }
  }

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  return (
    <Container size="full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Orders</h1>
      </div>

      {/* Search and Filter Bar */}
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
        <Select
          value={orderIdFilter}
          onChange={(e) => setOrderIdFilter(e.target.value)}
          options={[
            { value: 'order_id', label: 'Order ID' },
            { value: 'order_number', label: 'Order Number' },
          ]}
          className="min-w-[150px]"
        />
        <div className="relative">
          <Select
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All campaigns' },
              { value: 'new_emails', label: 'New emails' },
              { value: 'review_request', label: 'Review request' },
            ]}
            className="min-w-[180px]"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
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

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">
                  <button
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                    className="flex items-center gap-1 hover:text-text-primary"
                  >
                    Order date
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </TableHead>
                <TableHead className="whitespace-nowrap">Shipping date</TableHead>
                <TableHead className="whitespace-nowrap">Delivery date (estimated)</TableHead>
                <TableHead className="whitespace-nowrap">Order number</TableHead>
                <TableHead className="whitespace-nowrap">Marketplace</TableHead>
                <TableHead className="w-1/3">Products</TableHead>
                <TableHead className="whitespace-nowrap">Campaign</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
                <TableHead className="whitespace-nowrap">Last sent date</TableHead>
                <TableHead className="whitespace-nowrap">Black listed</TableHead>
                <TableHead className="w-20 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12">
                    <div className="text-text-muted">No orders found</div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="whitespace-nowrap">{order.orderDate}</TableCell>
                    <TableCell className="whitespace-nowrap">{order.shippingDate || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap">{order.deliveryDate || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-sm">{order.orderNumber}</TableCell>
                    <TableCell className="whitespace-nowrap">{order.marketplace}</TableCell>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <img
                          src={order.productImage}
                          alt={order.productTitle}
                          className="w-12 h-12 object-cover rounded border border-border flex-shrink-0"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50"%3E%3Crect width="50" height="50" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="10" fill="%239ca3af"%3EProduct%3C/text%3E%3C/svg%3E'
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-text-muted mb-0.5">{order.productSku}</div>
                          <div className="text-sm text-text-primary leading-relaxed whitespace-pre-line">
                            {order.productTitle}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-text-muted">{order.campaign || ''}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(order.status)}>
                        {getStatusLabel(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{order.lastSentDate || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={order.blackListed ? 'error' : 'secondary'}>
                        {order.blackListed ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <button className="p-1 hover:bg-surface-secondary rounded transition-colors">
                        <svg
                          className="w-5 h-5 text-text-muted"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <circle cx="12" cy="5" r="2" />
                          <circle cx="12" cy="12" r="2" />
                          <circle cx="12" cy="19" r="2" />
                        </svg>
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Container>
  )
})

OrdersScreen.displayName = 'OrdersScreen'
