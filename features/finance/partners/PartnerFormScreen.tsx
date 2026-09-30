'use client'

import React from 'react'
import { Spinner } from '@/design-system/loaders'
import { useGetPartnerQuery } from '@/services/api/finance.api'
import { PartnerForm } from './PartnerForm'

interface PartnerFormScreenProps {
  mode: 'create' | 'edit'
  partnerId?: number
}

export const PartnerFormScreen: React.FC<PartnerFormScreenProps> = ({ mode, partnerId }) => {
  if (mode === 'create') return <PartnerForm />
  return <EditPartner partnerId={partnerId ?? 0} />
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
