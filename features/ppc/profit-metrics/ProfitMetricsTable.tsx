'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { Spinner } from '@/design-system/loaders'
import { PPCProfitMetricsItem } from '@/types/ppcProfitMetrics.types'
import { formatNumber } from '@/utils/format'

export interface ProfitMetricsTableProps {
  items?: PPCProfitMetricsItem[]
  title: string
  isLoading?: boolean
  error?: any
}

export const ProfitMetricsTable: React.FC<ProfitMetricsTableProps> = ({
  items,
  title,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
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
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load profit metrics.</div>
        </CardContent>
      </Card>
    )
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-muted text-sm">No profit metrics available.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="text-right">Break-even ACOS</TableHead>
              <TableHead className="text-right">Estimated Profit</TableHead>
              <TableHead className="text-right">Suggested Bid</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-right">{formatNumber(item.spend, 2)}</TableCell>
                <TableCell className="text-right">{formatNumber(item.sales, 2)}</TableCell>
                <TableCell className="text-right">{formatNumber(item.breakEvenAcos, 2)}%</TableCell>
                <TableCell className="text-right">{formatNumber(item.estimatedProfit, 2)}</TableCell>
                <TableCell className="text-right">{formatNumber(item.suggestedBid, 2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

