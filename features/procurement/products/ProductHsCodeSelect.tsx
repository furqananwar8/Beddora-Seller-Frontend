'use client'

import React from 'react'
import { HsCodeSelect } from '@/features/shipping/shared/HsCodeSelect'
import { useGetProductHsCodesQuery } from '@/services/api/procurement.api'

interface ProductHsCodeSelectProps {
  id: string
  value: string
  onChange: (code: string) => void
  error?: string
  disabled?: boolean
  ariaLabel?: string
}

/** The HS code of a product or variation: optional, picked from the codes we ship under (Procurement permission). */
export function ProductHsCodeSelect(props: ProductHsCodeSelectProps) {
  const { data, isLoading } = useGetProductHsCodesQuery()
  return <HsCodeSelect {...props} catalogue={data ?? []} catalogueLoading={isLoading} allowNone unknownLabel="Current code" />
}
