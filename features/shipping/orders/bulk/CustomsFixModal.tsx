'use client'

import React, { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { hsDigits, HS_CODE } from '../../create/shipmentSchema'
import { HsCodeSelect } from '../../shared/HsCodeSelect'
import { OriginCountrySelect } from '../../shared/OriginCountrySelect'
import type { ChannelOrderDetail } from '../../types'
import type { ProductCustoms } from './useBulkBook'

interface Values {
  lines: Array<ProductCustoms & { productId: number; sku: string }>
}

interface CustomsFixModalProps {
  /** The order whose customs are incomplete; null while the modal is closed. */
  order: { orderId: string; detail: ChannelOrderDetail } | null
  onSave: (customs: Record<number, ProductCustoms>) => void
  onClose: () => void
}

/** One row per product of the order, started from what the product has, so only the gaps are filled. */
const rowsOf = (detail: ChannelOrderDetail): Values['lines'] => {
  const seen = new Map<number, Values['lines'][number]>()
  for (const { product } of detail.lines) {
    if (product && !seen.has(product.id)) seen.set(product.id, { productId: product.id, sku: product.sku ?? '', hsCode: product.hsCode ?? '', originCountry: product.originCountry ?? '' })
  }
  return [...seen.values()]
}

/**
 * Fills the HS code and country of origin a product lacks, without leaving the bulk page. They are used for the
 * bookings of this order made from this page; the product itself is not changed.
 */
export const CustomsFixModal: React.FC<CustomsFixModalProps> = ({ order, onSave, onClose }) => {
  const toUs = order?.detail.shipTo?.country === 'US'
  const schema = useMemo(
    () =>
      z.object({
        lines: z.array(
          z.object({
            productId: z.number(),
            sku: z.string(),
            hsCode: z.string().trim().superRefine((code, ctx) => {
              if (!code) return ctx.addIssue({ code: 'custom', message: 'Pick the HS code' })
              if (!HS_CODE.test(code) || hsDigits(code) < 6 || hsDigits(code) > 12) ctx.addIssue({ code: 'custom', message: '6–12 digits, dots allowed' })
              else if (toUs && hsDigits(code) !== 10) ctx.addIssue({ code: 'custom', message: 'US shipments need the full 10-digit HTS code' })
            }),
            originCountry: z.string().min(1, 'Country of origin is required'),
          })
        ),
      }),
    [toUs]
  )
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { lines: [] } })

  useEffect(() => {
    if (order) reset({ lines: rowsOf(order.detail) })
  }, [order, reset])

  const submit = handleSubmit((values) => {
    onSave(Object.fromEntries(values.lines.map(({ productId, hsCode, originCountry }) => [productId, { hsCode, originCountry }])))
    onClose()
  })

  const lines = order ? rowsOf(order.detail) : []
  return (
    <Modal isOpen={order !== null} onClose={onClose} title={`Customs details · ${order?.orderId ?? ''}`} size="lg">
      <form onSubmit={submit} noValidate className="space-y-4">
        <p className="text-sm text-text-muted">Carriers need an HS code and country of origin for every product. They are used for this order's bookings on this page.</p>
        {lines.map((line, index) => (
          <div key={line.productId} className="grid gap-3 sm:grid-cols-2">
            <p className="font-mono text-xs sm:col-span-2">{line.sku}</p>
            <Controller
              control={control}
              name={`lines.${index}.hsCode`}
              render={({ field }) => <HsCodeSelect id={`fix-hs-${line.productId}`} ariaLabel="HS code" value={field.value} onChange={field.onChange} error={errors.lines?.[index]?.hsCode?.message} prefilled={Boolean(line.hsCode)} />}
            />
            <Controller
              control={control}
              name={`lines.${index}.originCountry`}
              render={({ field }) => <OriginCountrySelect id={`fix-origin-${line.productId}`} ariaLabel="Country of origin" value={field.value} onChange={field.onChange} error={errors.lines?.[index]?.originCountry?.message} prefilled={Boolean(line.originCountry)} />}
            />
          </div>
        ))}
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Use these details</Button>
        </div>
      </form>
    </Modal>
  )
}
