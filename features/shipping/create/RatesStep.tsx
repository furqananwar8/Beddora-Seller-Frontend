'use client'

import React, { useMemo, useState } from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { Alert } from '@/design-system/alerts'
import { Button } from '@/design-system/buttons'
import { cn } from '@/utils/cn'
import { SectionCard } from '../shared/Card'
import { money, PROVIDER_LABEL } from '../shippingMeta'
import type { Incoterm, ProviderEvent, Rate, UnavailableService } from '../types'
import type { RateStream } from '../useRateStream'
import { RATE_SORTS, sortRates, tagRates, type RateSort } from './rateRanking'
import { RateRow, RateRowSkeleton } from './RateRow'
import { WizardFooter } from './WizardFooter'

interface RatesStepProps {
  stream: RateStream
  incoterm: Incoterm
  selectedRateId: string | null
  /** A rate id; null when the picked rate is clicked again. */
  onSelect: (rateId: string | null) => void
  onRetry: () => void
  onBack: () => void
  onContinue: () => void
}

/** One placeholder row kept below the rates that have arrived, until the last provider has answered. */
const SKELETON_ROWS = 1

const CHIP: Record<ProviderEvent['status'], string> = {
  loading: 'bg-sky-50 text-sky-700',
  done: 'bg-success-50 text-success-700',
  error: 'bg-danger-50 text-danger-700',
  skipped: 'bg-secondary-100 text-text-muted',
}

/** "Stallion · 4", "UniUni · loading…" */
const ProviderChip: React.FC<{ event: ProviderEvent }> = ({ event }) => (
  <span title={event.message} className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', CHIP[event.status])}>
    <span aria-hidden>{event.status === 'loading' ? '◌' : '●'}</span>
    {PROVIDER_LABEL[event.provider]} · {event.status === 'done' ? event.count ?? 0 : event.status === 'loading' ? 'loading…' : event.status}
  </span>
)

/** Shippo names a carrier account instead of a service: "Carrier account shippo_dpd_de_account doesn't…". */
const ACCOUNT = /^Carrier account (S+) /

interface UnavailableGroup {
  reason: string
  /** "Shippo · UPS", "Stallion Express · canada_post.regular", or the Shippo account. */
  who: string[]
}

/** The unavailable services grouped by why, so one cause isn't listed twenty times. */
function groupByReason(items: UnavailableService[]): UnavailableGroup[] {
  const groups = new Map<string, UnavailableGroup>()
  for (const item of items) {
    const account = ACCOUNT.exec(item.reason)?.[1]
    const reason = account ? item.reason.replace(ACCOUNT, 'A carrier account ') : item.reason
    const who = account ?? [item.providerLabel, item.service].filter(Boolean).join(' · ')
    const group = groups.get(reason) ?? { reason, who: [] }
    group.who.push(account ? `${item.providerLabel} · ${who}` : who)
    groups.set(reason, group)
  }
  return [...groups.values()].sort((a, b) => b.who.length - a.who.length)
}

/** Services a provider could not offer for this request, collapsed to one line until opened, then grouped by reason. */
const UnavailableStrip: React.FC<{ items: UnavailableService[] }> = ({ items }) => {
  const [open, setOpen] = useState(false)
  const groups = useMemo(() => groupByReason(items), [items])
  if (items.length === 0) return null
  return (
    <div className="rounded-lg border border-dashed border-border bg-secondary-50 px-3 py-2 text-sm">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex w-full items-center justify-between gap-2 text-left">
        <span>
          <b>
            {items.length} {items.length === 1 ? 'service' : 'services'} unavailable
          </b>
          <span className="ml-2 text-xs text-text-muted">
            {groups.length} {groups.length === 1 ? 'reason' : 'reasons'}
          </span>
        </span>
        <span className="text-xs text-primary-600 underline">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <ul className="mt-2 space-y-2 text-xs text-text-muted">
          {groups.map((group) => (
            <li key={group.reason}>
              <b className="text-text-primary">
                {group.reason} ({group.who.length})
              </b>
              <span className="block">{group.who.join(', ')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Step 3: rates stream in from every provider; one is selected. */
export const RatesStep: React.FC<RatesStepProps> = ({ stream, incoterm, selectedRateId, onSelect, onRetry, onBack, onContinue }) => {
  const [sort, setSort] = useState<RateSort>('PRICE')
  const done = stream.status === 'done'
  // Tags compare the whole list, so they wait for the last provider
  const rates = useMemo(() => sortRates(done ? tagRates(stream.rates) : stream.rates, sort), [done, stream.rates, sort])
  const providers = Object.values(stream.providers) as ProviderEvent[]
  const selected: Rate | undefined = rates.find((rate) => rate.rateId === selectedRateId)
  const streaming = stream.status === 'streaming'

  return (
    <>
      <SectionCard
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            Available services
            <span className="rounded-full bg-secondary-100 px-2 py-0.5 text-xs font-medium text-text-muted">
              {rates.length} {rates.length === 1 ? 'rate' : 'rates'}
            </span>
            {providers.map((event) => (
              <ProviderChip key={event.provider} event={event} />
            ))}
          </span>
        }
        aside={
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-muted">Sort by</span>
            <SearchableSelect<(typeof RATE_SORTS)[number]>
              id="rate-sort"
              ariaLabel="Sort rates"
              searchable={false}
              value={RATE_SORTS.find((option) => option.value === sort) ?? null}
              onChange={(option) => setSort(option.value)}
              options={RATE_SORTS}
              getKey={(option) => option.value}
              getLabel={(option) => option.label}
              className="w-64"
              triggerClassName="h-11 text-base font-medium"
            />
          </div>
        }
      >
        {streaming && <div className="mb-3 h-1 overflow-hidden rounded-full bg-secondary-100"><div className="h-full w-1/3 animate-pulse rounded-full bg-primary-500" /></div>}

        {stream.status === 'error' && (
          <Alert variant="danger" className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span>
              {stream.error}
              {stream.issues.length > 0 && <span className="block text-xs">{stream.issues.map((issue) => `${issue.field}: ${issue.message}`).join(' · ')}</span>}
            </span>
            <Button size="sm" variant="outline" onClick={onRetry}>
              Try again
            </Button>
          </Alert>
        )}

        <div className="space-y-2">
          {rates.map((rate) => (
            <RateRow key={rate.rateId} rate={rate} incoterm={incoterm} selected={rate.rateId === selectedRateId} onSelect={() => onSelect(rate.rateId === selectedRateId ? null : rate.rateId)} />
          ))}
          {streaming && Array.from({ length: SKELETON_ROWS }, (_, index) => <RateRowSkeleton key={`skeleton-${index}`} />)}
          {done && rates.length === 0 && <p className="py-6 text-center text-sm text-text-muted">No provider offered a service for this shipment. Check the unavailable services below, or change the package or options.</p>}
          <UnavailableStrip items={stream.unavailable} />
        </div>
      </SectionCard>

      <WizardFooter
        start={
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
        }
        hint={
          selected ? (
            <>
              Selected: <b className="text-text-primary">{`${selected.serviceName} · ${selected.providerLabel} · ${money(selected.total, selected.currency)}`}</b>
            </>
          ) : (
            'Select one service'
          )
        }
      >
        <Button disabled={!selected} onClick={onContinue}>
          Continue to Booking
        </Button>
      </WizardFooter>
    </>
  )
}
