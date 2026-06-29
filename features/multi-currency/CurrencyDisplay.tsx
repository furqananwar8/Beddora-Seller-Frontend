'use client'

import React from 'react'
import { useGetExchangeRateQuery } from '@/services/api/currency.api'
import { useAppSelector } from '@/store/hooks'
import { formatCurrency } from '@/utils/format'

export interface CurrencyDisplayProps {
  amount: number
  originalCurrencyCode: string
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  originalCurrencyCode,
}) => {
  const { baseCurrencyCode, selectedCurrencyCode, displayMode } = useAppSelector(
    (state) => state.currencies
  )

  const targetCurrency =
    displayMode === 'original' ? originalCurrencyCode : selectedCurrencyCode || baseCurrencyCode

  const shouldConvert = originalCurrencyCode !== targetCurrency

  const { data } = useGetExchangeRateQuery(
    shouldConvert ? { from: originalCurrencyCode, to: targetCurrency } : { from: originalCurrencyCode, to: originalCurrencyCode },
    { skip: !shouldConvert }
  )

  const rate = data?.data?.rate || 1
  const converted = shouldConvert ? amount * rate : amount

  return <span>{formatCurrency(converted, targetCurrency)}</span>
}

