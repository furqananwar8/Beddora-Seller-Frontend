'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { Badge } from '@/design-system/badges'
import { Spinner } from '@/design-system/loaders'
import { PPCCampaign } from '@/types/ppcDashboard.types'
import { formatNumber } from '@/utils/format'

export interface CampaignTableProps {
  items?: PPCCampaign[]
  isLoading?: boolean
  error?: any
}

export const CampaignTable: React.FC<CampaignTableProps> = ({ items, isLoading, error }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
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
          <CardTitle>Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load campaigns.</div>
        </CardContent>
      </Card>
    )
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-muted text-sm">No campaign data available.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaigns</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="text-right">ACOS</TableHead>
              <TableHead className="text-right">ROI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.campaignName}</TableCell>
                <TableCell>
                  <Badge variant={item.status === 'active' ? 'success' : 'secondary'} size="sm">
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{formatNumber(item.totalSpend, 2)}</TableCell>
                <TableCell className="text-right">{formatNumber(item.totalSales, 2)}</TableCell>
                <TableCell className="text-right">{formatNumber(item.acos, 2)}%</TableCell>
                <TableCell className="text-right">{formatNumber(item.roi, 2)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

