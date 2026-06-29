'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Button } from '@/design-system/buttons'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { Spinner } from '@/design-system/loaders'
import { EmailTemplate } from '@/types/emailTemplates.types'
import { formatDate } from '@/utils/format'

export interface EmailTemplateListProps {
  items?: EmailTemplate[]
  isLoading?: boolean
  error?: any
  onEdit?: (template: EmailTemplate) => void
  onDelete?: (id: string) => void
}

export const EmailTemplateList: React.FC<EmailTemplateListProps> = ({
  items,
  isLoading,
  error,
  onEdit,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Templates</CardTitle>
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
          <CardTitle>Email Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load templates.</div>
        </CardContent>
      </Card>
    )
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-muted text-sm">No templates yet.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Templates</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Targeting</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.subject}</TableCell>
                <TableCell>
                  <div className="text-xs text-text-muted space-y-1">
                    <div>Marketplace: {item.marketplaceId || 'All'}</div>
                    <div>Product ID: {item.productId || 'All'}</div>
                    <div>SKU: {item.sku || 'All'}</div>
                    <div>Purchase: {item.purchaseType || 'All'}</div>
                  </div>
                </TableCell>
                <TableCell>{formatDate(item.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => onEdit?.(item)}>
                      Edit
                    </Button>
                    <Button size="sm" onClick={() => onDelete?.(item.id)}>
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

