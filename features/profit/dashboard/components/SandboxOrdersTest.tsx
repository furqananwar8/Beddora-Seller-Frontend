'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Spinner } from '@/design-system/loaders'
import { ErrorComponent } from './ErrorComponent'
import { Select } from '@/design-system/inputs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/design-system/tables'
import { useGetSandboxOrdersQuery, useTestSandboxConnectionQuery } from '@/services/api/amazon.api'
import { useGetAmazonAccountsQuery } from '@/services/api/accounts.api'
import { formatCurrency, formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'

/**
 * SandboxOrdersTest Component
 * 
 * Fetches and displays sandbox orders from the backend test endpoint.
 * 
 * Features:
 * - Fetches data from /api/amazon/sandbox/orders on mount
 * - Displays orders in a responsive table
 * - Shows loader while fetching
 * - Shows error message if API call fails
 * - Fully responsive and mobile-friendly
 * 
 * Architecture Note: This component is modular and can be extracted
 * to a separate microservice frontend.
 */

export interface SandboxOrdersTestProps {
  className?: string
  amazonAccountId?: string // Optional: if not provided, user must select
}

/**
 * SandboxOrdersTest Component
 * 
 * Displays sandbox orders in a table format for testing SP-API integration.
 * Uses a single Amazon account from the database (no client secret required in env).
 * 
 * Features:
 * - Account selector dropdown (if amazonAccountId not provided)
 * - Fetches orders from selected account
 * - Shows connection test status
 * - Displays orders in a responsive table
 */
export const SandboxOrdersTest: React.FC<SandboxOrdersTestProps> = ({
  className,
  amazonAccountId: initialAmazonAccountId,
}) => {
  // State for selected Amazon account
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    initialAmazonAccountId || ''
  )

  // Get Amazon accounts for the current user
  const { data: amazonAccounts = [] } = useGetAmazonAccountsQuery()

  // Test connection when account is selected OR use env vars if no account selected
  const {
    data: connectionTest,
    isLoading: isTestingConnection,
  } = useTestSandboxConnectionQuery(
    { amazonAccountId: selectedAccountId || undefined },
    { skip: false } // Always test (will use env vars if no account selected)
  )

  // Fetch sandbox orders using RTK Query
  // If no account selected, will use environment variables
  const {
    data: ordersResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetSandboxOrdersQuery(
    {
      amazonAccountId: selectedAccountId || undefined,
    },
    {
      skip: false, // Always fetch (will use env vars if no account selected)
    }
  )

  // Extract orders from response
  const orders = ordersResponse?.data || []

  return (
    <div className={cn('w-full', className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sandbox Orders Test</CardTitle>
            {!initialAmazonAccountId && (
              <div className="min-w-[250px]">
                <Select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  options={[
                    { value: '', label: 'Select Amazon Account...' },
                    ...amazonAccounts.map((account) => ({
                      value: account.id,
                      label: `${(account as any).amazonSellerId || account.sellerId || account.id} (${account.marketplace})`,
                    })),
                  ]}
                  disabled={amazonAccounts.length === 0}
                />
              </div>
            )}
          </div>
          {connectionTest && (
            <div className="mt-2 space-y-2">
              <div
                className={cn(
                  'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
                  connectionTest.success
                    ? 'bg-success-100 text-success-800'
                    : 'bg-danger-100 text-danger-800'
                )}
              >
                {connectionTest.success ? '✓ Connected' : '✗ Connection Failed'}
                {connectionTest.amazonSellerId && (
                  <span className="ml-2">
                    ({connectionTest.amazonSellerId} - {connectionTest.marketplace})
                  </span>
                )}
                {connectionTest.appName && !connectionTest.amazonSellerId && (
                  <span className="ml-2">
                    ({connectionTest.appName})
                  </span>
                )}
              </div>
              {!connectionTest.success && connectionTest.message && (
                <div className="text-xs text-danger-600 bg-danger-50 p-2 rounded border border-danger-200">
                  <p className="font-medium mb-1">Error Details:</p>
                  <p>{connectionTest.message}</p>
                  {connectionTest.message.includes('expired') || connectionTest.message.includes('revoked') ? (
                    <p className="mt-2 text-xs">
                      💡 <strong>Solution:</strong> Get a new refresh token from Amazon Seller Central and update your environment variables.
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="flex flex-col items-center gap-3">
                <Spinner size="lg" />
                <p className="text-sm text-text-secondary">Loading sandbox orders...</p>
              </div>
            </div>
          ) : isError ? (
            <div className="p-6">
              <ErrorComponent
                error={error}
                onRetry={() => refetch()}
                title="Failed to load sandbox orders"
              />
            </div>
          ) : orders.length === 0 ? (
            <div className="p-6">
              <div className="text-center text-text-muted py-8">
                <p className="text-sm">No sandbox orders available.</p>
                <p className="text-xs mt-2">The sandbox endpoint may not be configured yet.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Order ID</TableHead>
                    <TableHead className="min-w-[150px]">Order Date</TableHead>
                    <TableHead className="min-w-[120px]">Marketplace</TableHead>
                    <TableHead className="min-w-[120px] text-right">Total Amount</TableHead>
                    {orders[0]?.orderStatus && (
                      <TableHead className="min-w-[100px]">Status</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.orderId} className="hover:bg-surface-secondary">
                      <TableCell className="font-medium">{order.orderId}</TableCell>
                      <TableCell>
                        {formatDate(order.orderDate, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>{order.marketplace}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(
                          order.totalAmount,
                          order.currency || 'USD'
                        )}
                      </TableCell>
                      {order.orderStatus && (
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                              order.orderStatus === 'Shipped' ||
                                order.orderStatus === 'Delivered'
                                ? 'bg-success-100 text-success-800'
                                : order.orderStatus === 'Pending' ||
                                  order.orderStatus === 'Processing'
                                ? 'bg-warning-100 text-warning-800'
                                : 'bg-surface-secondary text-text-muted'
                            )}
                          >
                            {order.orderStatus}
                          </span>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
