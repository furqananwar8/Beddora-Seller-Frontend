'use client'

import React, { useState } from 'react'
import { Button } from '@/design-system/buttons'
import { useGetPaymentRequestQuery } from '@/services/api/finance.api'
import { ChangeExpenseDialog } from './ChangeExpenseDialog'

/**
 * "Change expense" for a request, shown only to who may (an admin), for use where the request itself isn't loaded
 * (the Payment Process detail): it reads the request, which says whether the viewer can change its expense, and
 * opens the same dialog as the Payment Requests screen.
 */
export const ChangeExpenseAction: React.FC<{ requestId: number }> = ({ requestId }) => {
  const [open, setOpen] = useState(false)
  const { data: detail } = useGetPaymentRequestQuery(requestId)
  if (!detail?.can.changeExpense) return null
  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        Change expense
      </Button>
      <ChangeExpenseDialog detail={detail} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
