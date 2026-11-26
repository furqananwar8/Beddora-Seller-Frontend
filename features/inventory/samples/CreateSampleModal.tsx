'use client'

import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChoiceSelect } from '@/components/choice-select/ChoiceSelect'
import { FileDropzone } from '@/components/file-dropzone/FileDropzone'
import { FormField, fieldClass } from '@/components/form-field/FormField'
import { NumericInput } from '@/components/form-field/NumericInput'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { ProductSelect } from '@/features/procurement/shared/ProductPicker'
import { SupplierSelect } from '@/features/procurement/shared/SupplierSelect'
import type { PoProduct, SupplierRef } from '@/services/api/procurement.api'
import { useCreateSampleMutation } from '@/services/api/samples.api'
import { applyServerIssues } from '@/utils/apiErrors'

const schema = z
  .object({
    supplier: z.custom<SupplierRef | null>(),
    currency: z.enum(['USD', 'CAD']),
    product: z.custom<PoProduct | null>(),
    paid: z.boolean(),
    units: z.string().trim().refine((value) => /^\d+$/.test(value) && Number(value) >= 1, 'Enter at least 1 unit').refine((value) => Number(value) <= 10_000_000, 'Too many units'),
    unitPrice: z.string().trim(),
    /** Optional documents, attached the same way as on payment requests and proofs of payment. */
    files: z.array(z.custom<File>()),
  })
  .superRefine((values, ctx) => {
    if (!values.supplier) ctx.addIssue({ code: 'custom', path: ['supplier'], message: 'Supplier is required' })
    if (!values.product) ctx.addIssue({ code: 'custom', path: ['product'], message: 'Pick a product' })
    if (values.paid && !(Number(values.unitPrice) > 0)) ctx.addIssue({ code: 'custom', path: ['unitPrice'], message: 'Enter the sample price' })
  })

type Values = z.infer<typeof schema>

const DEFAULTS: Values = { supplier: null, currency: 'USD', product: null, paid: false, units: '', unitPrice: '', files: [] }
const FORM_FIELDS = new Set(['supplierId', 'currency', 'productId', 'units', 'unitPrice', 'documents'])
const PATHS: Record<string, keyof Values> = { supplierId: 'supplier', productId: 'product', documents: 'files' }

interface CreateSampleModalProps {
  isOpen: boolean
  onClose: () => void
}

/** Makes a standalone sample: a product from a supplier, free or paid. A PO can link it later, or it is paid on its own. */
export const CreateSampleModal: React.FC<CreateSampleModalProps> = ({ isOpen, onClose }) => {
  const { success, failure } = useApiFeedback()
  const [createSample, { isLoading }] = useCreateSampleMutation()
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: DEFAULTS, mode: 'onTouched' })
  const paid = watch('paid')

  const close = () => {
    reset(DEFAULTS)
    onClose()
  }

  const submit = handleSubmit(async (values) => {
    try {
      const body = new FormData()
      body.append('supplierId', String(values.supplier!.id))
      body.append('currency', values.currency)
      body.append('productId', String(values.product!.id))
      body.append('units', values.units)
      body.append('unitPrice', String(values.paid ? Number(values.unitPrice) : 0))
      values.files.forEach((file) => body.append('documents', file))
      await createSample(body).unwrap()
      success('Sample created')
      close()
    } catch (error) {
      const placed = applyServerIssues(error, (field, issue, options) => setError((PATHS[field] ?? field) as never, issue, options), (field) => FORM_FIELDS.has(field))
      if (!placed) failure(error, 'Could not create the sample')
    }
  })

  return (
    <Modal isOpen={isOpen} onClose={close} title="Create sample" size="md">
      <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
        <FormField label="Supplier" htmlFor="sample-supplier" required error={errors.supplier?.message as string | undefined}>
          <Controller control={control} name="supplier" render={({ field }) => <SupplierSelect id="sample-supplier" value={field.value} error={errors.supplier?.message as string | undefined} onChange={field.onChange} />} />
        </FormField>
        <FormField label="Product" htmlFor="sample-product" required error={errors.product?.message as string | undefined}>
          <Controller control={control} name="product" render={({ field }) => <ProductSelect id="sample-product" value={field.value} error={errors.product?.message as string | undefined} onChange={field.onChange} />} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Sample is" htmlFor="sample-paid">
            <Controller
              control={control}
              name="paid"
              render={({ field }) => (
                <ChoiceSelect
                  id="sample-paid"
                  title="Sample is"
                  value={field.value ? 'PAID' : 'FREE'}
                  onChange={(next) => field.onChange(next === 'PAID')}
                  options={[
                    { value: 'FREE', label: 'Free (no cost)' },
                    { value: 'PAID', label: 'Paid' },
                  ]}
                />
              )}
            />
          </FormField>
          <FormField label="Currency" htmlFor="sample-currency">
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <ChoiceSelect<'USD' | 'CAD'>
                  id="sample-currency"
                  title="Currency"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: 'USD', label: 'USD' },
                    { value: 'CAD', label: 'CAD' },
                  ]}
                />
              )}
            />
          </FormField>
          <FormField label="Units" htmlFor="sample-units" required error={errors.units?.message}>
            <NumericInput id="sample-units" className={fieldClass(errors.units?.message)} {...register('units')} />
          </FormField>
          {paid && (
            <FormField label="Price per unit" htmlFor="sample-price" required error={errors.unitPrice?.message}>
              <NumericInput decimal id="sample-price" placeholder="0.00" className={fieldClass(errors.unitPrice?.message)} {...register('unitPrice')} />
            </FormField>
          )}
        </div>
        <FormField label="Documents" htmlFor="sample-documents" error={errors.files?.message as string | undefined}>
          <Controller
            control={control}
            name="files"
            render={({ field }) => (
              <FileDropzone
                multiple
                files={field.value}
                onChange={field.onChange}
                title="Upload sample documents"
                hint="Optional · quotes, photos or spec sheets"
                error={errors.files?.message as string | undefined}
                disabled={isLoading}
              />
            )}
          />
        </FormField>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={close} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Create sample
          </Button>
        </div>
      </form>
    </Modal>
  )
}
