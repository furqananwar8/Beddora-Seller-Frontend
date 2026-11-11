'use client'

import React, { useEffect } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useChangePaymentRequestExpensesMutation, useGetLeafCostCentersQuery, type PaymentRequestDetail } from '@/services/api/finance.api'
import { CostCenterField } from '../shared/CostCenterSelect'
import { formatCurrencyAmount, formatRequestNo } from '../shared/format'

const COST_CENTERS_HREF = '/dashboard/finance/cost-center'

const schema = z.object({
  lines: z.array(z.object({ id: z.number(), costCenterId: z.string().min(1, 'Pick an expense') })),
})
type FormValues = z.infer<typeof schema>

const valuesOf = (detail: PaymentRequestDetail): FormValues => ({
  lines: detail.lines.map((line) => ({ id: line.id, costCenterId: line.costCenter ? String(line.costCenter.id) : '' })),
})

/** Admin only: re-books each amount of a request to another expense, whatever its status (paid or not). Amounts never change. */
export const ChangeExpenseDialog: React.FC<{ detail: PaymentRequestDetail; open: boolean; onClose: () => void }> = ({ detail, open, onClose }) => {
  const { success, failure } = useApiFeedback()
  const { data: costCenters, isFetching } = useGetLeafCostCentersQuery(undefined, { skip: !open })
  const [save, { isLoading }] = useChangePaymentRequestExpensesMutation()
  const { control, handleSubmit, reset } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: valuesOf(detail) })
  const { fields } = useFieldArray({ control, name: 'lines' })

  useEffect(() => {
    if (open) reset(valuesOf(detail))
  }, [open, detail, reset])

  const submit = handleSubmit(async ({ lines }) => {
    try {
      await save({ id: detail.id, lines: lines.map((line) => ({ id: line.id, costCenterId: Number(line.costCenterId) })) }).unwrap()
      success(`${formatRequestNo(detail.id)} expense updated`)
      onClose()
    } catch (error) {
      failure(error, 'Could not change the expense')
    }
  })

  return (
    <Modal isOpen={open} onClose={onClose} title="Change expense" size="md" closeOnEscape={!isLoading} className="sm:overflow-visible">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm text-text-muted">Moves the amounts of {formatRequestNo(detail.id)} to other expenses. Amounts and payment status stay as they are; the change is recorded on the timeline.</p>
        {fields.map((field, index) => (
          <div key={field.id} className="flex flex-col gap-1">
            <p className="text-sm font-medium text-text-primary">
              {detail.lines.length > 1 ? `Amount ${index + 1} · ` : ''}
              {formatCurrencyAmount(detail.currency, detail.lines[index]?.amount ?? 0)}
            </p>
            <CostCenterField control={control} name={`lines.${index}.costCenterId`} options={costCenters} loading={isFetching} addHref={COST_CENTERS_HREF} />
          </div>
        ))}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}
