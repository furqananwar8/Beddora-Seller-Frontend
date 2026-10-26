'use client'

import React, { useMemo, useState } from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { useGetPayableInvoicesQuery, type PurchaseInvoiceForPayment } from '@/services/api/finance.api'
import { formatCurrencyAmount, formatMoney } from '../shared/format'

interface PayableInvoiceSelectProps {
  id?: string
  /** The partner being paid; its approved invoices with money left to request are offered. */
  partnerId: number | null
  /** The invoice number on the request (one of ours or any other). */
  value: string
  onPick: (invoice: PurchaseInvoiceForPayment) => void
  /** An invoice number that is not one of our purchase invoices, typed in. */
  onOther: (invoiceNo: string) => void
  error?: string
}

type Choice = Pick<PurchaseInvoiceForPayment, 'invoiceNo'> & Partial<PurchaseInvoiceForPayment>

/** "Invoice No": the partner's unpaid purchase invoices, or any other number typed in. */
export const PayableInvoiceSelect: React.FC<PayableInvoiceSelectProps> = ({ id, partnerId, value, onPick, onOther, error }) => {
  const [search, setSearch] = useState('')
  const { data = [], isFetching } = useGetPayableInvoicesQuery({ partnerId: partnerId ?? 0 }, { skip: !partnerId })

  const term = search.trim().toLowerCase()
  const options = useMemo(
    () => (term ? data.filter((invoice) => invoice.invoiceNo.toLowerCase().includes(term) || invoice.invoiceRef.toLowerCase().includes(term)) : data),
    [data, term]
  )
  const typed = search.trim()
  const offerTyped = typed !== '' && !data.some((invoice) => invoice.invoiceNo.toLowerCase() === typed.toLowerCase())

  return (
    <SearchableSelect<Choice>
      id={id}
      value={value ? (data.find((invoice) => invoice.invoiceNo === value) ?? { invoiceNo: value }) : null}
      onChange={(choice) => (choice.id ? onPick(choice as PurchaseInvoiceForPayment) : onOther(choice.invoiceNo))}
      options={options}
      getKey={(choice) => choice.id ?? choice.invoiceNo}
      getLabel={(choice) => choice.invoiceNo}
      renderOption={(choice) => (
        <span className="flex items-center justify-between gap-2">
          <span className="font-medium">{choice.invoiceNo}</span>
          <span className="shrink-0 text-xs text-text-muted">
            {choice.invoiceRef} · {formatCurrencyAmount(choice.currency!, choice.leftToRequest!)} left of {formatMoney(choice.amount!)}
          </span>
        </span>
      )}
      search={search}
      onSearchChange={setSearch}
      searchable
      loading={isFetching}
      placeholder={partnerId ? 'Select or type an invoice number' : 'Pick the partner first'}
      searchPlaceholder="Invoice number, e.g. INV-10442"
      emptyText={typed ? 'No unpaid invoice of this partner matches.' : 'This partner has no unpaid purchase invoice.'}
      footer={
        offerTyped
          ? (close) => (
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-primary-600 hover:bg-surface-muted"
                onClick={() => {
                  onOther(typed)
                  setSearch('')
                  close()
                }}
              >
                Use “{typed}”
              </button>
            )
          : undefined
      }
      error={error}
      disabled={!partnerId}
    />
  )
}
