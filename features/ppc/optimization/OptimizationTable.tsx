'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { Spinner } from '@/design-system/loaders'
import { Input } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { Badge } from '@/design-system/badges'
import { formatNumber } from '@/utils/format'
import { PPCOptimizationItem } from '@/types/ppcOptimization.types'

export interface OptimizationTableProps {
  items?: PPCOptimizationItem[]
  isLoading?: boolean
  error?: any
  onManualUpdate?: (keywordId: string, bid: number) => void
}

const StatusBadge: React.FC<{ status: PPCOptimizationItem['status'] }> = ({ status }) => {
  const variant = status === 'active' ? 'success' : status === 'paused' ? 'warning' : 'error'
  return <Badge variant={variant}>{status}</Badge>
}

const ModeBadge: React.FC<{ mode: PPCOptimizationItem['optimizationMode'] }> = ({ mode }) => {
  return <Badge variant={mode === 'autoplay' ? 'primary' : 'secondary'}>{mode}</Badge>
}

const OptimizationRow: React.FC<{
  item: PPCOptimizationItem
  onManualUpdate?: (keywordId: string, bid: number) => void
}> = ({ item, onManualUpdate }) => {
  const [bid, setBid] = useState<number>(item.currentBid)

  return (
    <TableRow key={item.id}>
      <TableCell className="font-medium">{item.keyword}</TableCell>
      <TableCell>{item.matchType || '—'}</TableCell>
      <TableCell className="text-right">{formatNumber(item.spend, 2)}</TableCell>
      <TableCell className="text-right">{formatNumber(item.sales, 2)}</TableCell>
      <TableCell className="text-right">{formatNumber(item.acos, 2)}%</TableCell>
      <TableCell className="text-right">{formatNumber(item.currentBid, 2)}</TableCell>
      <TableCell className="text-right">{formatNumber(item.suggestedBid || item.currentBid, 2)}</TableCell>
      <TableCell>
        <ModeBadge mode={item.optimizationMode} />
      </TableCell>
      <TableCell>
        <StatusBadge status={item.status} />
      </TableCell>
      <TableCell className="min-w-[180px]">
        <div className="flex items-center gap-2">
          <Input
            value={bid}
            type="number"
            onChange={(e) => setBid(Number(e.target.value))}
            className="w-24"
          />
          <Button
            size="sm"
            onClick={() => onManualUpdate?.(item.id, bid)}
            disabled={!onManualUpdate}
          >
            Update
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

export const OptimizationTable: React.FC<OptimizationTableProps> = ({
  items,
  isLoading,
  error,
  onManualUpdate,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Keyword Optimization</CardTitle>
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
          <CardTitle>Keyword Optimization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load optimization data.</div>
        </CardContent>
      </Card>
    )
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Keyword Optimization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-muted text-sm">No optimization data available.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Keyword Optimization</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Keyword</TableHead>
              <TableHead>Match Type</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="text-right">ACOS</TableHead>
              <TableHead className="text-right">Current Bid</TableHead>
              <TableHead className="text-right">Suggested Bid</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Manual Update</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <OptimizationRow key={item.id} item={item} onManualUpdate={onManualUpdate} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

