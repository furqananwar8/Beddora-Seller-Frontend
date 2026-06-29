'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { BulkHistoryItem } from '@/types/ppcBulk.types'

export interface BulkHistoryTableProps {
  items?: BulkHistoryItem[]
  isLoading?: boolean
  error?: any
  onRevert?: (historyId: string) => void
}

export const BulkHistoryTable: React.FC<BulkHistoryTableProps> = ({
  items,
  isLoading,
  error,
  onRevert,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bulk History</CardTitle>
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
          <CardTitle>Bulk History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load bulk history.</div>
        </CardContent>
      </Card>
    )
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bulk History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-muted text-sm">No bulk actions yet.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk History</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Target Type</TableHead>
              <TableHead>Targets</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.actionType}</TableCell>
                <TableCell>{item.targetType}</TableCell>
                <TableCell>{item.targetIds?.length || 0}</TableCell>
                <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  {onRevert ? (
                    <Button variant="outline" size="sm" onClick={() => onRevert(item.id)}>
                      Undo
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

