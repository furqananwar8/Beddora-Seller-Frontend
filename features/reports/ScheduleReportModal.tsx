"use client"

import React, { useEffect, useState } from 'react'
import { Modal } from '@/design-system/modals'
import { Input, Select } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { ReportSchedule, ReportType, ScheduledReport } from '@/services/api/reports.api'

export interface ScheduleReportModalProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  initialData?: ScheduledReport
  onSubmit: (data: {
    reportType: ReportType
    schedule: ReportSchedule
    emailRecipients: string[]
  }) => void
}

export const ScheduleReportModal: React.FC<ScheduleReportModalProps> = ({
  isOpen,
  onClose,
  accountId,
  initialData,
  onSubmit,
}) => {
  const [reportType, setReportType] = useState<ReportType>('profit')
  const [schedule, setSchedule] = useState<ReportSchedule>('monthly')
  const [recipients, setRecipients] = useState('')

  useEffect(() => {
    if (initialData) {
      setReportType(initialData.reportType)
      setSchedule(initialData.schedule)
      setRecipients(initialData.emailRecipients.join(', '))
    }
  }, [initialData])

  const handleSubmit = () => {
    const emailRecipients = recipients
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean)

    onSubmit({
      reportType,
      schedule,
      emailRecipients,
    })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Report" size="md">
      <div className="space-y-4">
        <Select
          label="Report Type"
          value={reportType}
          onChange={(e) => setReportType(e.target.value as ReportType)}
          options={[
            { value: 'profit', label: 'Profit' },
            { value: 'inventory', label: 'Inventory' },
            { value: 'ppc', label: 'PPC' },
            { value: 'returns', label: 'Returns' },
          ]}
        />

        <Select
          label="Schedule"
          value={schedule}
          onChange={(e) => setSchedule(e.target.value as ReportSchedule)}
          options={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
          ]}
        />

        <Input
          label="Email Recipients"
          placeholder="user@company.com, manager@company.com"
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {initialData ? 'Update Schedule' : 'Create Schedule'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

