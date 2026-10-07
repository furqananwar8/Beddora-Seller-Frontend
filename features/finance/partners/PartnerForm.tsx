'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/design-system/buttons'
import {
  useAddPaymentMethodMutation,
  useCreatePartnerMutation,
  useGetPartnersQuery,
  useLazyCheckPartnerNameQuery,
  useRemovePaymentMethodMutation,
  useUpdatePartnerMutation,
  type PartnerDetail,
  type PaymentMethod,
} from '@/services/api/finance.api'
import { useDebounce } from '@/utils/debounce'
import { safeFinanceReturnTo, withQueryParam } from '../payment-requests/requestDraftStore'
import { formatPartnerNo } from '../shared/format'
import { useFinanceFeedback } from '../shared/useFinanceFeedback'
import { BasicDetailsSection } from './BasicDetailsSection'
import { PaymentDetailsSection } from './PaymentDetailsSection'
import { PaymentMethodDialog } from './PaymentMethodDialog'
import { buildPartnerFormData, buildPartnerPatch, buildPaymentMethodFormData } from './partnerPayload'
import { applyServerIssues } from '@/utils/apiErrors'
import {
  emptyPartnerValues,
  PARTNER_FIELDS,
  partnerSchema,
  type PartnerFormValues,
  type PaymentMethodFormValues,
  type StagedPaymentMethod,
} from './partnerSchema'

const LIST = '/dashboard/finance/partner-profile'

interface PartnerFormProps {
  /** Present in edit mode. */
  partner?: PartnerDetail
}

export const PartnerForm: React.FC<PartnerFormProps> = ({ partner }) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = safeFinanceReturnTo(searchParams.get('returnTo'))
  /** `?type=SUPPLIER` preselects the type, e.g. from a procurement "+ New supplier" link. */
  const presetType = searchParams.get('type') === 'SUPPLIER' ? 'SUPPLIER' : undefined
  const { success, failure } = useFinanceFeedback()
  const editing = Boolean(partner)

  const [staged, setStaged] = useState<StagedPaymentMethod[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [similarNames, setSimilarNames] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const [createPartner] = useCreatePartnerMutation()
  const [updatePartner] = useUpdatePartnerMutation()
  const [addMethod] = useAddPaymentMethodMutation()
  const [removeMethod] = useRemovePaymentMethodMutation()
  const [checkName] = useLazyCheckPartnerNameQuery()
  const { data: countData } = useGetPartnersQuery({ page: 1, limit: 1 })

  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<PartnerFormValues>({
    resolver: zodResolver(partnerSchema),
    defaultValues: partner
      ? {
          name: partner.name,
          type: partner.type,
          contactName: partner.contactName ?? '',
          country: partner.country ?? '',
          province: partner.province ?? '',
          city: partner.city ?? '',
          postalCode: partner.postalCode ?? '',
          email: partner.email ?? '',
          address: partner.address ?? '',
          currency: partner.currency,
        }
      : { ...emptyPartnerValues, ...(presetType && { type: presetType }) },
  })

  const name = watch('name')
  const debouncedName = useDebounce(name, 400)
  useEffect(() => {
    const trimmed = debouncedName.trim()
    if (trimmed.length < 2 || trimmed.toLowerCase() === partner?.name.toLowerCase()) {
      setSimilarNames([])
      return
    }
    let cancelled = false
    checkName(trimmed)
      .unwrap()
      .then((matches) => !cancelled && setSimilarNames(matches.filter((match) => match.id !== partner?.id).map((match) => match.name)))
      .catch(() => !cancelled && setSimilarNames([]))
    return () => {
      cancelled = true
    }
  }, [debouncedName, partner?.id, partner?.name, checkName])

  const addPaymentMethod = async (values: PaymentMethodFormValues, methodFiles: File[]) => {
    if (!partner) {
      setStaged((current) => [...current, { key: crypto.randomUUID(), values, files: methodFiles }])
      setDialogOpen(false)
      return
    }
    try {
      await addMethod({ partnerId: partner.id, body: buildPaymentMethodFormData(values, methodFiles) }).unwrap()
      success('Payment method added')
      setDialogOpen(false)
    } catch (error) {
      failure(error, 'Could not add the payment method')
    }
  }

  const removeSaved = async (method: PaymentMethod) => {
    if (!partner) return
    setRemovingId(method.id)
    try {
      await removeMethod({ partnerId: partner.id, methodId: method.id }).unwrap()
      success('Payment method removed')
    } catch (error) {
      failure(error, 'Could not remove the payment method')
    } finally {
      setRemovingId(null)
    }
  }

  const submit = handleSubmit(async (values) => {
    setSaving(true)
    try {
      if (partner) {
        await updatePartner({ id: partner.id, body: buildPartnerPatch(values) }).unwrap()
        success('Partner saved')
        router.push(LIST)
        return
      }

      const created = await createPartner(buildPartnerFormData(values)).unwrap()
      try {
        for (const item of staged) {
          await addMethod({ partnerId: created.id, body: buildPaymentMethodFormData(item.values, item.files) }).unwrap()
        }
      } catch (error) {
        failure(error, 'Partner created, but a payment method could not be saved. Add it again here.')
        router.replace(`${LIST}/${created.id}`)
        return
      }
      success('Partner created')
      router.push(returnTo ? withQueryParam(returnTo, 'partnerId', String(created.id)) : LIST)
    } catch (error) {
      // Field-level problems (e.g. a city outside the chosen province) show under their inputs
      if (!applyServerIssues(error, setError, PARTNER_FIELDS)) failure(error, 'Could not save the partner')
    } finally {
      setSaving(false)
    }
  })

  return (
    <div className="mx-auto w-full max-w-4xl px-3 py-4 sm:px-6 sm:py-8">

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Partner Profile</h1>
          <span className="rounded-full bg-secondary-100 px-2.5 py-0.5 font-mono text-xs text-text-secondary">
            {partner ? formatPartnerNo(partner.id) : 'New'}
          </span>
        </div>
        {returnTo && !editing ? (
          <Button type="button" variant="outline" onClick={() => router.push(withQueryParam(returnTo, 'restore', '1'))}>
            Back to payment request
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => router.push(LIST)}>
            All partners ({countData?.totalRecords ?? 0})
          </Button>
        )}
      </div>

      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <BasicDetailsSection register={register} control={control} errors={errors} similarNames={similarNames} />
        <PaymentDetailsSection
          saved={partner?.paymentMethods ?? []}
          staged={staged}
          removingId={removingId}
          onAdd={() => setDialogOpen(true)}
          onRemoveSaved={removeSaved}
          onRemoveStaged={(key) => setStaged((current) => current.filter((item) => item.key !== key))}
        />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(returnTo && !editing ? withQueryParam(returnTo, 'restore', '1') : LIST)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            {editing ? 'Save' : 'Submit'}
          </Button>
        </div>
      </form>

      <PaymentMethodDialog
        isOpen={dialogOpen}
        subtitle={`${partner?.name ?? (name.trim() || 'New partner')} · ${partner ? formatPartnerNo(partner.id) : 'New'}`}
        onClose={() => setDialogOpen(false)}
        onSubmit={addPaymentMethod}
      />
    </div>
  )
}
