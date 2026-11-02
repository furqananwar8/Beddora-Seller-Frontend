import React from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/design-system/buttons'
import { Skeleton } from '@/design-system/loaders'
import { cn } from '@/utils/cn'
import { ProviderLogo } from '../shared/ProviderLogo'
import { amount, money, PROVIDER_LABEL, shortDay, transitDays } from '../shippingMeta'
import type { Incoterm, ProviderId, Rate } from '../types'
import { TAG_LABEL } from './rateRanking'

const TAG_CLASS = { CHEAPEST: 'bg-success-50 text-success-700', FASTEST: 'bg-sky-50 text-sky-700', BEST_VALUE: 'bg-secondary-100 text-secondary-800' }
const ROW = 'grid items-center gap-3 rounded-lg border px-3 py-3 sm:grid-cols-[40px_minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)_auto]'

/** Base · surcharges, then duties and taxes: the second column of figures. */
const Breakdown: React.FC<{ rate: Rate; incoterm: Incoterm }> = ({ rate, incoterm }) => {
  const charges = [rate.baseRate !== null && `Base ${amount(rate.baseRate)}`, ...rate.surcharges.map((surcharge) => `${surcharge.label} ${amount(surcharge.amount)}`)].filter(Boolean)
  return (
    <div className="text-xs leading-5 text-text-muted">
      {charges.length > 0 && <div>{charges.join(' · ')}</div>}
      <div>
        {rate.duties !== null ? (
          <>
            Duties ({incoterm}) <b className="text-text-primary">{amount(rate.duties)}</b>
          </>
        ) : (
          rate.dutiesNote && (
            <>
              Duties ({incoterm}) <b className="text-text-primary">{rate.dutiesNote.toLowerCase()}</b>
            </>
          )
        )}
        {rate.taxes !== null && <> · Taxes {amount(rate.taxes)}</>}
      </div>
    </div>
  )
}

interface RateRowProps {
  rate: Rate
  incoterm: Incoterm
  selected: boolean
  onSelect: () => void
}

/** One service: logo, name, tags, transit, breakdown, total and Select. */
export const RateRow: React.FC<RateRowProps> = ({ rate, incoterm, selected, onSelect }) => {
  const days = transitDays(rate)
  return (
    <div className={cn(ROW, selected ? 'border-primary-500 bg-secondary-100 ring-1 ring-primary-500' : 'border-border')}>
      <ProviderLogo provider={rate.provider} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-text-primary">{rate.serviceName}</span>
          {rate.tags.map((tag) => (
            <span key={tag} className={cn('rounded-full px-2 py-0.5 text-xs font-medium', TAG_CLASS[tag])}>
              {TAG_LABEL[tag]}
            </span>
          ))}
        </div>
        <div className="text-xs text-text-muted">
          {rate.providerLabel}
          {rate.carrier && rate.carrier !== rate.providerLabel && ` · ${rate.carrier}`}
        </div>
      </div>
      <div className="text-sm">
        {days ? (
          <>
            <b>{days}</b> working {days === '1' ? 'day' : 'days'}
          </>
        ) : (
          <span className="text-text-muted">Transit not given</span>
        )}
        {rate.estimatedDelivery && <div className="text-xs text-text-muted">Est. {shortDay(rate.estimatedDelivery)}</div>}
      </div>
      <Breakdown rate={rate} incoterm={incoterm} />
      <div>
        <div className="text-base font-semibold tabular-nums text-text-primary">{money(rate.total, rate.currency)}</div>
        <div className="text-xs text-text-muted">{rate.duties !== null ? 'incl. duties' : rate.dutiesNote ? '+ duties later' : ''}</div>
      </div>
      <Button size="sm" variant={selected ? 'primary' : 'outline'} onClick={onSelect} aria-pressed={selected}>
        {selected ? (
          <>
            <Check className="mr-1 h-4 w-4" aria-hidden /> Selected
          </>
        ) : (
          'Select'
        )}
      </Button>
    </div>
  )
}

/** A provider still answering. */
export const RateRowSkeleton: React.FC<{ provider: ProviderId }> = ({ provider }) => (
  <div className={cn(ROW, 'border-dashed border-border')} aria-busy>
    <ProviderLogo provider={provider} className="opacity-60" />
    <div className="space-y-1.5">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
    </div>
    <Skeleton className="h-4 w-3/4" />
    <div className="space-y-1.5">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
    <Skeleton className="h-5 w-20" />
    <span className="text-xs text-text-muted">{PROVIDER_LABEL[provider]}…</span>
  </div>
)
