'use client'

import React from 'react'
import { Button } from '@/design-system/buttons'
import { useReportExport } from '@/hooks/useReportExport'
import type { ExportReport } from '@/services/api/exports.api'

interface ExportExcelButtonProps {
  report: ExportReport
  /** The filters the screen's table is showing right now (what its list request sends, without paging). */
  filters: Record<string, unknown>
  /** What the toasts call the file; defaults to "export". */
  noun?: string
}

/**
 * "Export Excel" for a list screen. The whole filtered result is built in the background (queue, worker, SSE) and
 * downloaded the moment it is ready, so the click returns straight away.
 */
export const ExportExcelButton: React.FC<ExportExcelButtonProps> = ({ report, filters, noun }) => {
  const { start, isExporting } = useReportExport(report, { noun })
  return (
    <Button type="button" size="sm" variant="outline" disabled={isExporting} onClick={() => void start('xlsx', filters)}>
      {isExporting ? 'Exporting…' : 'Export Excel'}
    </Button>
  )
}
