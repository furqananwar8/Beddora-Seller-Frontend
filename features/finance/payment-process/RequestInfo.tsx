'use client'

import React from 'react'
import type { PaymentDocumentDetail } from '@/services/api/finance.api'
import { formatRequestNo } from '../shared/format'
import { DocumentChips } from '../shared/DocumentChips'

const Item: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-xs text-text-muted">{label}</dt>
    <dd className="break-words text-sm font-medium text-text-primary">{children}</dd>
  </div>
)

/** The request behind a payment: who and what it is for, the requester's remarks and the documents they attached. */
export const RequestInfo: React.FC<{ request: PaymentDocumentDetail['request'] }> = ({ request }) => (
  <div className="space-y-3">
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
      <Item label="Partner">{request.partner.name}</Item>
      <Item label="Request">
        {formatRequestNo(request.id)} · {request.reference.value}
      </Item>
      <Item label="Expense">{request.expenseType.name}</Item>
      <Item label="Container #">{request.containerNo || '-'}</Item>
      <div className="col-span-2 min-w-0 sm:col-span-2">
        <dt className="text-xs text-text-muted">Remarks</dt>
        <dd className="whitespace-pre-wrap break-words text-sm text-text-primary">{request.remarks || '-'}</dd>
      </div>
    </dl>
    <div>
      <div className="mb-1 text-xs text-text-muted">Documents from the request</div>
      <DocumentChips documents={request.documents} emptyText="No documents were attached to the request" />
    </div>
  </div>
)
