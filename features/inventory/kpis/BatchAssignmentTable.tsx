'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { Spinner } from '@/design-system/loaders'
import { FifoBatchAssignment } from '@/types/inventoryKpis.types'
import { formatDate, formatNumber } from '@/utils/format'

export interface BatchAssignmentTableProps {
  assignments?: FifoBatchAssignment[]
  isLoading?: boolean
  error?: any
}

export const BatchAssignmentTable: React.FC<BatchAssignmentTableProps> = ({
  assignments,
  isLoading,
  error,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>FIFO Batch Assignments</CardTitle>
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
          <CardTitle>FIFO Batch Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load batch assignments.</div>
        </CardContent>
      </Card>
    )
  }

  if (!assignments || assignments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>FIFO Batch Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-muted text-sm">No batch assignments available.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>FIFO Batch Assignments</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch</TableHead>
              <TableHead>Received</TableHead>
              <TableHead className="text-right">Qty Assigned</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((assignment) => (
              <TableRow key={assignment.batchId}>
                <TableCell className="font-medium">{assignment.batchId}</TableCell>
                <TableCell>{formatDate(assignment.receivedAt)}</TableCell>
                <TableCell className="text-right">
                  {formatNumber(assignment.quantityAssigned, 0)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

