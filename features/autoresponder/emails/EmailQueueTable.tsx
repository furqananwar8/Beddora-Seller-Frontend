'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { Spinner } from '@/design-system/loaders'
import { EmailQueueItem } from '@/types/emailTemplates.types'
import { formatDateTime } from '@/utils/format'

export interface EmailQueueTableProps {
  items?: EmailQueueItem[]
  isLoading?: boolean
  error?: any
}

export const EmailQueueTable: React.FC<EmailQueueTableProps> = ({ items, isLoading, error }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Queue</CardTitle>
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
          <CardTitle>Email Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load email queue.</div>
        </CardContent>
      </Card>
    )
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-muted text-sm">No queued emails.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Queue</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Opens</TableHead>
              <TableHead>Clicks</TableHead>
              <TableHead>Responses</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.templateName}</TableCell>
                <TableCell>{item.recipientEmail}</TableCell>
                <TableCell>{item.status}</TableCell>
                <TableCell>{formatDateTime(item.scheduledAt)}</TableCell>
                <TableCell>{item.sentAt ? formatDateTime(item.sentAt) : '—'}</TableCell>
                <TableCell>{item.openedCount}</TableCell>
                <TableCell>{item.clickedCount}</TableCell>
                <TableCell>{item.responseCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

