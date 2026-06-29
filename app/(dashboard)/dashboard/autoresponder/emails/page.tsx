'use client'

import React, { useState } from 'react'
import { Container, PageHeader } from '@/components/layout'
import { Input } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setSelectedTemplateId } from '@/store/emailTemplates.slice'
import {
  useFetchEmailTemplates,
  useCreateEmailTemplate,
  useUpdateEmailTemplate,
  useDeleteEmailTemplate,
  useFetchEmailQueue,
  useFetchEmailStats,
  useSendEmailNow,
} from '@/features/autoresponder/emails/hooks'
import {
  EmailQueueTable,
  EmailStatisticsChart,
  EmailTemplateForm,
  EmailTemplateList,
} from '@/features/autoresponder/emails'
import { EmailTemplate } from '@/types/emailTemplates.types'

export default function AutomatedEmailsPage() {
  const dispatch = useAppDispatch()
  const selectedTemplateId = useAppSelector((state) => state.emailTemplates.selectedTemplateId)
  const [sendEmail, setSendEmail] = useState('')

  const { data: templates, isLoading: templatesLoading, error: templatesError } = useFetchEmailTemplates()
  const { data: queue, isLoading: queueLoading, error: queueError } = useFetchEmailQueue()
  const { data: stats, isLoading: statsLoading, error: statsError } = useFetchEmailStats()

  const [createTemplate, { isLoading: creating }] = useCreateEmailTemplate()
  const [updateTemplate, { isLoading: updating }] = useUpdateEmailTemplate()
  const [deleteTemplate] = useDeleteEmailTemplate()
  const [sendNow] = useSendEmailNow()

  const selectedTemplate = templates?.find((item) => item.id === selectedTemplateId) || null

  const handleSubmit = async (payload: Partial<EmailTemplate>) => {
    if (selectedTemplate) {
      await updateTemplate({ id: selectedTemplate.id, payload }).unwrap()
    } else {
      await createTemplate(payload).unwrap()
    }
    dispatch(setSelectedTemplateId(undefined))
  }

  const handleDelete = async (id: string) => {
    await deleteTemplate({ id }).unwrap()
  }

  const handleSendNow = async () => {
    if (!selectedTemplate || !sendEmail) return
    await sendNow({ templateId: selectedTemplate.id, recipientEmail: sendEmail }).unwrap()
    setSendEmail('')
  }

  return (
    <Container>
      <PageHeader
        title="Automated Emails"
        description="Create Amazon-compliant templates and automate review requests."
      />

      <div className="space-y-6">
        <EmailTemplateForm
          template={selectedTemplate}
          onSubmit={handleSubmit}
          onReset={() => dispatch(setSelectedTemplateId(undefined))}
          isLoading={creating || updating}
        />

        <div className="flex items-end gap-3">
          <Input
            label="Recipient Email"
            value={sendEmail}
            onChange={(e) => setSendEmail(e.target.value)}
            className="w-80"
          />
          <Button onClick={handleSendNow} disabled={!selectedTemplate || !sendEmail}>
            Send Now
          </Button>
        </div>

        <EmailTemplateList
          items={templates}
          isLoading={templatesLoading}
          error={templatesError}
          onEdit={(template) => dispatch(setSelectedTemplateId(template.id))}
          onDelete={handleDelete}
        />

        <EmailStatisticsChart data={stats} isLoading={statsLoading} error={statsError} />

        <EmailQueueTable items={queue} isLoading={queueLoading} error={queueError} />
      </div>
    </Container>
  )
}

