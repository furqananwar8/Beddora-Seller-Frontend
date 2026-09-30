'use client'

import React from 'react'
import { Modal } from '@/design-system/modals'
import { Spinner } from '@/design-system/loaders'
import { StatusBadge } from '@/components/status-badge/StatusBadge'
import { useGetPaymentDocumentQuery } from '@/services/api/finance.api'
import { formatCurrencyAmount, formatDocNo, formatRequestNo } from '../shared/format'
import { DOC_STATUS_META } from '../shared/statusMeta'
import { BankDetailsPanel } from './BankDetailsPanel'
import { PopList } from './PopList'

const Item: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-xs text-text-muted">{label}</dt>
    <dd className="text-sm font-medium text-text-primary">{children}</dd>
  </div>
)

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section>
    <h3 className="mb-2 text-sm font-semibold text-text-primary">{title}</h3>
    {children}
  </section>
)

interface PaymentDetailModalProps {
  docId: number | null
  onClose: () => void
}

export const PaymentDetailModal: React.FC<PaymentDetailModalProps> = ({ docId, onClose }) => {
  const { data, isLoading, isError } = useGetPaymentDocumentQuery(docId ?? 0, { skip: docId === null })
  const meta = data ? DOC_STATUS_META[data.status] : null

  return (
    <Modal isOpen={docId !== null} onClose={onClose} title={docId !== null ? formatDocNo(docId) : undefined} size="lg">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : isError || !data ? (
        <p className="py-12 text-center font-medium text-danger-600">Could not load this payment.</p>
      ) : (
        <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            <Item label="Partner">{data.request.partner.name}</Item>
            <Item label="Request">
              {formatRequestNo(data.request.id)} · {data.request.invoiceNo}
            </Item>
            <Item label="Status">{meta && <StatusBadge label={meta.label} tone={meta.tone} />}</Item>
            <Item label="Amount">{formatCurrencyAmount(data.currency, data.amount)}</Item>
            <Item label="Paid">{formatCurrencyAmount(data.currency, data.paidAmount)}</Item>
            <Item label="Balance">{formatCurrencyAmount(data.currency, data.balance)}</Item>
          </dl>

          <Section title="Proofs of payment">
            <PopList pops={data.pops} />
          </Section>

          <Section title="Payment method">
            <BankDetailsPanel key={data.id} docId={data.id} method={data.paymentMethod} />
          </Section>
        </div>
      )}
    </Modal>
  )
}
