"use client"

import React from 'react'
import { Button } from '@/design-system/buttons'
import { useLazyExportReportQuery, ReportFilters, ReportFormat, ReportType } from '@/services/api/reports.api'

export interface ReportExportButtonsProps {
  reportType: ReportType
  filters: ReportFilters
}

export const ReportExportButtons: React.FC<ReportExportButtonsProps> = ({ reportType, filters }) => {
  const [exportReport, { isFetching }] = useLazyExportReportQuery()

  const handleExport = async (format: ReportFormat) => {
    const blob = await exportReport({ reportType, format, filters }).unwrap()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${reportType}-report.${format === 'excel' ? 'xlsx' : format}`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => handleExport('csv')} isLoading={isFetching}>
        Export CSV
      </Button>
      <Button variant="outline" onClick={() => handleExport('excel')} isLoading={isFetching}>
        Export Excel
      </Button>
      <Button variant="outline" onClick={() => handleExport('pdf')} isLoading={isFetching}>
        Export PDF
      </Button>
    </div>
  )
}

