'use client'

import React, { useMemo, useState } from 'react'
import { Combobox } from '@/components/combobox/Combobox'
import { useGetPayableInvoicesQuery, type PurchaseInvoiceForPayment } from '@/services/api/finance.api'
import { formatCurrencyAmount, formatMoney } from '../shared/format'

interface PayableInvoiceSelectProps {
  id?: string
  /** The partner being paid; its approved invoices with money left to request are suggested. */
  partnerId: number | null
  /** The invoice number on the request (one of ours or any other). */
  value: string
  onPick: (invoice: PurchaseInvoiceForPayment) => void
  /** An invoice number typed in by hand (it may still match one of our purchase invoices). */
  onOther: (invoiceNo: string) => void
  error?: string
}

/** "Invoice No": type any invoice number, or pick one of the partner's unpaid purchase invoices. */
export const PayableInvoiceSelect: React.FC<PayableInvoiceSelectProps> = ({ id, partnerId, value, onPick, onOther, error }) => {
  const [search, setSearch] = useState('')
  const { data = [], isFetching } = useGetPayableInvoicesQuery({ partnerId: partnerId ?? 0 }, { skip: !partnerId })

  const term = search.trim().toLowerCase()
  const options = useMemo(
    () => (term ? data.filter((invoice) => invoice.invoiceNo.toLowerCase().includes(term) || invoice.invoiceRef.toLowerCase().includes(term)) : data),
    [data, term]
  )

  return (
    <Combobox<PurchaseInvoiceForPayment>
      id={id}
      value={value}
      options={options}
      getKey={(invoice) => invoice.id}
      getLabel={(invoice) => invoice.invoiceNo}
      renderOption={(invoice) => (
        <span className="flex items-center justify-between gap-2">
          <span className="font-medium">{invoice.invoiceNo}</span>
          <span className="shrink-0 text-xs text-text-muted">
            {invoice.invoiceRef} · {formatCurrencyAmount(invoice.currency, invoice.leftToRequest)} left of {formatMoney(invoice.amount)}
          </span>
        </span>
      )}
      onPick={onPick}
      onCommit={onOther}
      onInputChange={setSearch}
      loading={isFetching}
      maxLength={80}
      placeholder={partnerId ? 'Type or pick an invoice number' : 'Pick the partner first'}
      error={error}
      disabled={!partnerId}
    />
  )
}
