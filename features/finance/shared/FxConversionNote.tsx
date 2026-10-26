'use client'

import React from 'react'
import { useGetFxTodayQuery } from '@/services/api/finance.api'
import { REPORTING_CURRENCY } from './currency'
import { formatCurrencyAmount, formatDay } from './format'
import { convertedAmount } from './money'

interface FxConversionNoteProps {
  currency: string
  amount: number
  /** A rate already stored on the record; without one, today's rate is shown as a preview. */
  stored?: { fxRate: number | null; fxRateAsOf: string | null; baseAmount: number | null; baseCurrency: string | null } | null
}

/** The exchange rate into the reporting currency and the converted amount. Nothing shows for amounts already in it. */
export const FxConversionNote: React.FC<FxConversionNoteProps> = ({ currency, amount, stored }) => {
  const target = stored?.baseCurrency ?? REPORTING_CURRENCY
  const hasStored = stored?.fxRate != null
  const needsFx = Boolean(currency) && currency !== target
  const fx = useGetFxTodayQuery({ from: currency, to: target }, { skip: !needsFx || hasStored })
  if (!needsFx) return null

  const rate = hasStored ? stored!.fxRate! : fx.data?.rate
  const asOf = hasStored ? stored!.fxRateAsOf : fx.data?.asOf
  const converted = hasStored && stored!.baseAmount != null ? stored!.baseAmount : rate != null ? convertedAmount(amount, rate) : null

  return (
    <div className="mt-4 grid gap-3 rounded-lg border border-border bg-surface-muted/40 p-3 text-sm sm:grid-cols-2">
      <div>
        <p className="text-xs text-text-muted">Exchange rate ({currency} to {target})</p>
        <p className="font-medium text-text-primary">
          {rate != null ? rate : fx.isFetching ? 'Fetching today’s rate...' : 'No rate available yet'}
        </p>
        {asOf && <p className="text-xs text-text-muted">{hasStored ? 'Recorded' : 'Rate'} as of {formatDay(asOf)}</p>}
      </div>
      <div>
        <p className="text-xs text-text-muted">Amount in {target}</p>
        <p className="font-medium text-text-primary">{converted != null ? formatCurrencyAmount(target, converted) : '—'}</p>
        {!hasStored && <p className="text-xs text-text-muted">The day’s rate is recorded when the request is saved</p>}
      </div>
    </div>
  )
}
