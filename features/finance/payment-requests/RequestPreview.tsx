'use client'

import { countryLabel } from '../shared/countryLabel'
import React from 'react'
import { Spinner } from '@/design-system/loaders'
import { useGetPaymentRequestQuery } from '@/services/api/finance.api'
import { DocumentChips } from '../shared/DocumentChips'

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <p className="text-xs text-text-muted">{label}</p>
    <p className="break-words text-sm font-semibold text-text-primary">{children}</p>
  </div>
)

/** Expanded row content: the bits an approver needs without opening the full request. */
export const RequestPreview: React.FC<{ id: number; requestedBy: string }> = ({ id, requestedBy }) => {
  const { data, isLoading, isError } = useGetPaymentRequestQuery(id)

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner />
      </div>
    )
  }
  if (isError || !data) return <p className="py-2 text-center text-sm text-danger-600">Could not load the preview.</p>

  return (
    <div className="grid gap-4 p-2 text-left sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_2fr]">
      <Field label="Expense type">{data.expenseType.name}</Field>
      <Field label="Destination">{data.marketplace ? countryLabel(data.marketplace.code) || data.marketplace.name : '-'}</Field>
      <Field label="Requested by">{requestedBy}</Field>
      <Field label="Remarks">{data.remarks || '-'}</Field>
      <div className="min-w-0 sm:col-span-2 lg:col-span-1">
        <DocumentChips documents={data.documents} />
      </div>
    </div>
  )
}
