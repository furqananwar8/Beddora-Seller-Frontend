'use client'

import React, { Suspense } from 'react'
import { Spinner } from '@/design-system/loaders'
import { useGetPartnerQuery } from '@/services/api/finance.api'
import { PartnerForm } from './PartnerForm'

interface PartnerFormScreenProps {
  mode: 'create' | 'edit'
  partnerId?: number
}

export const PartnerFormScreen: React.FC<PartnerFormScreenProps> = ({ mode, partnerId }) => {
  // PartnerForm reads the query string (returnTo), which needs a Suspense boundary.
  return <Suspense fallback={null}>{mode === 'create' ? <PartnerForm /> : <EditPartner partnerId={partnerId ?? 0} />}</Suspense>
}

const EditPartner: React.FC<{ partnerId: number }> = ({ partnerId }) => {
  const { data, isLoading, isError } = useGetPartnerQuery(partnerId, { skip: !partnerId })

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    )
  }
  if (isError || !data) {
    return <div className="py-24 text-center font-medium text-danger-600">Could not load this partner.</div>
  }
  // Payment methods refresh live through the cache tag; the keyed form keeps typed values otherwise.
  return <PartnerForm key={data.id} partner={data} />
}
