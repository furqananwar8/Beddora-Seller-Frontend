'use client'

import React from 'react'
import { Button } from '@/design-system/buttons'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards/Card'
import type { PaymentMethod } from '@/services/api/finance.api'
import { PaymentMethodCard } from './PaymentMethodCard'
import { stagedMethodLabel, type StagedPaymentMethod } from './partnerSchema'

interface PaymentDetailsSectionProps {
  saved: PaymentMethod[]
  staged: StagedPaymentMethod[]
  removingId: number | null
  onAdd: () => void
  onRemoveSaved: (method: PaymentMethod) => void
  onRemoveStaged: (key: string) => void
}

export const PaymentDetailsSection: React.FC<PaymentDetailsSectionProps> = ({ saved, staged, removingId, onAdd, onRemoveSaved, onRemoveStaged }) => {
  const empty = saved.length === 0 && staged.length === 0

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <CardTitle>Payment details</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          + Add bank details
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {empty && (
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
            <div className="font-medium text-text-primary">No payment method yet</div>
            <div className="mt-1 text-sm text-text-muted">Add bank account details or a credit-card payment link.</div>
          </div>
        )}
        {saved.map((method) => (
          <PaymentMethodCard key={method.id} method={method} removing={removingId === method.id} onRemove={() => onRemoveSaved(method)} />
        ))}
        {staged.map((item) => (
          <PaymentMethodCard
            key={item.key}
            staged
            method={{
              label: stagedMethodLabel(item.values),
              type: item.values.type,
              swiftCode: item.values.swiftCode.toUpperCase(),
              routingNo: item.values.routingNo,
              accountHolder: item.values.accountHolder,
              paymentLink: item.values.paymentLink,
              pendingFiles: item.files.map((file) => file.name),
            }}
            onRemove={() => onRemoveStaged(item.key)}
          />
        ))}
      </CardContent>
    </Card>
  )
}
