'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Button } from '@/design-system/buttons'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { Spinner } from '@/design-system/loaders'
import { Badge } from '@/design-system/badges'
import { SchedulingRule } from '@/services/api/schedulingRules.api'
import { formatDate } from '@/utils/format'

export interface SchedulingRuleListProps {
  items?: SchedulingRule[]
  isLoading?: boolean
  error?: any
  onEdit?: (rule: SchedulingRule) => void
  onDelete?: (id: string) => void
  onToggleActive?: (id: string, isActive: boolean) => void
  filters?: {
    accountId?: string
    marketplaceId?: string
    templateId?: string
    isActive?: boolean
  }
  onFilterChange?: (filters: SchedulingRuleListProps['filters']) => void
}

export const SchedulingRuleList: React.FC<SchedulingRuleListProps> = ({
  items,
  isLoading,
  error,
  onEdit,
  onDelete,
  onToggleActive,
  filters,
  onFilterChange,
}) => {
  const [localFilters, setLocalFilters] = useState(filters || {})

  const handleFilterChange = (key: keyof typeof localFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    onFilterChange?.(newFilters)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scheduling Rules</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Spinner />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scheduling Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load scheduling rules.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Scheduling Rules</CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={localFilters.isActive === undefined ? 'all' : localFilters.isActive ? 'active' : 'inactive'}
              onChange={(e) => {
                const value = e.target.value === 'all' ? undefined : e.target.value === 'active'
                handleFilterChange('isActive', value)
              }}
              className="text-sm border border-border rounded px-2 py-1"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!items || items.length === 0 ? (
          <div className="p-6 text-center text-text-muted text-sm">
            No scheduling rules found. Create one to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Delay</TableHead>
                <TableHead>Conditions</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.template?.name || 'Unknown Template'}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {item.deliveryDelayDays} {item.deliveryDelayDays === 1 ? 'day' : 'days'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-text-muted space-y-1 max-w-xs">
                      {item.conditions ? (
                        <>
                          {item.conditions.firstTimeBuyer && (
                            <div>• First-time buyers only</div>
                          )}
                          {item.conditions.notReturned && <div>• Not returned</div>}
                          {item.conditions.minOrderValue && (
                            <div>• Min order: ${(item.conditions.minOrderValue / 100).toFixed(2)}</div>
                          )}
                          {item.conditions.maxOrderValue && (
                            <div>• Max order: ${(item.conditions.maxOrderValue / 100).toFixed(2)}</div>
                          )}
                          {item.conditions.skus && item.conditions.skus.length > 0 && (
                            <div>• SKUs: {item.conditions.skus.join(', ')}</div>
                          )}
                          {item.conditions.hasReview && <div>• Has review</div>}
                          {item.conditions.noReview && <div>• No review</div>}
                        </>
                      ) : (
                        <div>No conditions</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-text-muted space-y-1">
                      {item.marketplaceId && <div>Marketplace: {item.marketplaceId}</div>}
                      {item.productId && <div>Product: {item.productId}</div>}
                      {item.sku && <div>SKU: {item.sku}</div>}
                      {!item.marketplaceId && !item.productId && !item.sku && (
                        <div>All products</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? 'success' : 'secondary'}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(item.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onToggleActive?.(item.id, !item.isActive)}
                      >
                        {item.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onEdit?.(item)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => onDelete?.(item.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

