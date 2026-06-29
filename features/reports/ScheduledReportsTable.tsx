"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Button } from '@/design-system/buttons'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/design-system/tables'
import { ScheduledReport } from '@/services/api/reports.api'

export interface ScheduledReportsTableProps {
  reports?: ScheduledReport[]
  isLoading?: boolean
  error?: any
  onEdit?: (report: ScheduledReport) => void
  onDelete?: (report: ScheduledReport) => void
}

export const ScheduledReportsTable: React.FC<ScheduledReportsTableProps> = ({
  reports,
  isLoading,
  error,
  onEdit,
  onDelete,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Scheduled Reports</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="text-sm text-text-muted">Loading schedules...</div>}
        {error && <div className="text-sm text-danger-600">Failed to load schedules</div>}
        {!isLoading && !error && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Type</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Next Run</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports && reports.length > 0 ? (
                reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="capitalize">{report.reportType}</TableCell>
                    <TableCell className="capitalize">{report.schedule}</TableCell>
                    <TableCell>{report.emailRecipients.join(', ')}</TableCell>
                    <TableCell>
                      {report.nextRunAt ? new Date(report.nextRunAt).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {onEdit && (
                          <Button variant="outline" size="sm" onClick={() => onEdit(report)}>
                            Edit
                          </Button>
                        )}
                        {onDelete && (
                          <Button variant="danger" size="sm" onClick={() => onDelete(report)}>
                            Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-text-muted">
                    No scheduled reports
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

