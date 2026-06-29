'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/design-system/tables'
import { Button } from '@/design-system/buttons'
import { Badge } from '@/design-system/badges'
import { Spinner } from '@/design-system/loaders'
import { ReimbursementCase } from '@/services/api/reimbursementCases.api'
import { formatDate } from '@/utils/format'

export interface CaseListTableProps {
  cases?: ReimbursementCase[]
  isLoading?: boolean
  error?: any
  onEdit?: (caseItem: ReimbursementCase) => void
  onView?: (caseItem: ReimbursementCase) => void
}

const statusBadge = (status: ReimbursementCase['submissionStatus']) => {
  const variants: Record<typeof status, 'secondary' | 'warning' | 'success'> = {
    draft: 'secondary',
    submitted: 'warning',
    resolved: 'success',
  }
  return <Badge variant={variants[status]}>{status}</Badge>
}

export const CaseListTable: React.FC<CaseListTableProps> = ({
  cases = [],
  isLoading,
  error,
  onEdit,
  onView,
}) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reimbursement Cases</CardTitle>
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
          <CardTitle>Reimbursement Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-danger-600 text-sm">Failed to load cases.</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reimbursement Cases</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {cases.length === 0 ? (
          <div className="p-6 text-center text-text-muted text-sm">No cases yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Marketplace</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.caseType.replace('_', ' ')}</TableCell>
                  <TableCell>{c.marketplace?.name || c.marketplaceId}</TableCell>
                  <TableCell>{c.sku || c.product?.sku || '-'}</TableCell>
                  <TableCell>{statusBadge(c.submissionStatus)}</TableCell>
                  <TableCell>{formatDate(c.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => onView?.(c)}>
                        View
                      </Button>
                      <Button size="sm" onClick={() => onEdit?.(c)}>
                        Edit
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

