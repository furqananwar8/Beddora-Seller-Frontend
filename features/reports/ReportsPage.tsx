"use client"

import React, { useMemo, useState } from 'react'
import { Container, PageHeader } from '@/components/layout'
import { ReportFilterPanel } from './ReportFilterPanel'
import { ReportExportButtons } from './ReportExportButtons'
import { ScheduledReportsTable } from './ScheduledReportsTable'
import { ScheduleReportModal } from './ScheduleReportModal'
import {
  useGetScheduledReportsQuery,
  useCreateScheduledReportMutation,
  useUpdateScheduledReportMutation,
  useDeleteScheduledReportMutation,
  ReportFilters,
  ReportType,
  ScheduledReport,
} from '@/services/api/reports.api'
import { useGetAccountsQuery } from '@/services/api/accounts.api'
import { Button } from '@/design-system/buttons'

export const ReportsPage: React.FC = () => {
  const { data: accountsData } = useGetAccountsQuery()
  const [reportType, setReportType] = useState<ReportType>('profit')
  const [filters, setFilters] = useState<ReportFilters>({ accountId: '' })
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ScheduledReport | undefined>(undefined)

  const accountId = filters.accountId || accountsData?.[0]?.id || ''
  const effectiveFilters = useMemo(
    () => ({
      ...filters,
      accountId,
    }),
    [filters, accountId]
  )

  const { data: schedules, isLoading, error } = useGetScheduledReportsQuery(
    { accountId },
    { skip: !accountId }
  )

  const [createSchedule] = useCreateScheduledReportMutation()
  const [updateSchedule] = useUpdateScheduledReportMutation()
  const [deleteSchedule] = useDeleteScheduledReportMutation()

  const handleScheduleSubmit = async (data: {
    reportType: ReportType
    schedule: any
    emailRecipients: string[]
  }) => {
    if (!accountId) return
    if (editingSchedule) {
      await updateSchedule({ id: editingSchedule.id, data }).unwrap()
    } else {
      await createSchedule({
        accountId,
        reportType: data.reportType,
        schedule: data.schedule,
        filters: effectiveFilters,
        emailRecipients: data.emailRecipients,
      }).unwrap()
    }
    setEditingSchedule(undefined)
  }

  const handleScheduleEdit = (report: ScheduledReport) => {
    setEditingSchedule(report)
    setScheduleModalOpen(true)
  }

  const handleScheduleDelete = async (report: ScheduledReport) => {
    await deleteSchedule(report.id).unwrap()
  }

  const marketplaces =
    accountsData?.flatMap((account) =>
      account.marketplaces.map((marketplace) => ({
        id: marketplace.id,
        name: marketplace.name,
        code: marketplace.code,
      }))
    ) || []

  return (
    <Container>
      <PageHeader
        title="Export & Reports"
        description="Generate exports, schedule reports, and deliver insights"
        actions={
          <Button onClick={() => setScheduleModalOpen(true)}>Schedule Report</Button>
        }
      />

      <div className="space-y-6">
        <ReportFilterPanel
          reportType={reportType}
          filters={effectiveFilters}
          onReportTypeChange={setReportType}
          onFiltersChange={setFilters}
          marketplaces={marketplaces}
        />

        <ReportExportButtons reportType={reportType} filters={effectiveFilters} />

        <ScheduledReportsTable
          reports={schedules}
          isLoading={isLoading}
          error={error}
          onEdit={handleScheduleEdit}
          onDelete={handleScheduleDelete}
        />
      </div>

      <ScheduleReportModal
        isOpen={scheduleModalOpen}
        onClose={() => {
          setScheduleModalOpen(false)
          setEditingSchedule(undefined)
        }}
        accountId={accountId}
        initialData={editingSchedule}
        onSubmit={handleScheduleSubmit}
      />
    </Container>
  )
}

