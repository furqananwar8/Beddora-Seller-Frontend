'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { Spinner } from '@/design-system/loaders'
import { PPCOptimizationHistoryItem } from '@/types/ppcOptimization.types'
import { formatNumber } from '@/utils/format'

export interface OptimizationHistoryTableProps {
  items?: PPCOptimizationHistoryItem[]
  isLoading?: boolean
  error?: any
}

export const OptimizationHistoryTable: React.FC<OptimizationHistoryTableProps> = ({
  items,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Optimization History</CardTitle>
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
          <CardTitle>Optimization History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load history.</div>
        </CardContent>
      </Card>
    )
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Optimization History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-muted text-sm">No optimization history yet.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Optimization History</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Keyword</TableHead>
              <TableHead className="text-right">Previous Bid</TableHead>
              <TableHead className="text-right">New Bid</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.keyword}</TableCell>
                <TableCell className="text-right">
                  {item.previousBid === null ? '—' : formatNumber(item.previousBid, 2)}
                </TableCell>
                <TableCell className="text-right">
                  {item.newBid === null ? '—' : formatNumber(item.newBid, 2)}
                </TableCell>
                <TableCell>{item.reason}</TableCell>
                <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

