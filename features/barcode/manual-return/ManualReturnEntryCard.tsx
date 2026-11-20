'use client'

import { Button } from '@/design-system/buttons'
import { Input, Select, Textarea } from '@/design-system/inputs'
import { Spinner } from '@/design-system/loaders'
import { skipToken } from '@reduxjs/toolkit/query'
import { useDebounce } from '@/utils/debounce'
import { useGetManualReturnProductsQuery, type ManualReturnMetadata, type ManualReturnOption, type ManualReturnProduct } from '@/services/api/barcode.api'

/** What one return holds while it is being filled in. */
export interface ReturnEntry {
  key: number
  channel: string
  marketplace: string
  product: ManualReturnProduct | null
  search: string
  units: string
  damaged: string
  remarks: string
  details: ManualReturnMetadata[]
}

export const digits = (value: string) => value.replace(/[^0-9]/g, '')
export const count = (value: string) => Number(digits(value)) || 0

/** Why an entry cannot be saved yet, or null. */
export function entryProblem(entry: ReturnEntry): string | null {
  if (!entry.product) return 'Pick the returned product'
  if (count(entry.units) < 1) return 'Enter how many units came back'
  if (count(entry.damaged) > count(entry.units)) return 'More units are marked damaged than came back'
  return null
}

interface Props {
  entry: ReturnEntry
  options: ManualReturnOption[]
  /** Set when the card is one of a batch: it gets a heading and can be removed. */
  position?: { index: number; onRemove: (() => void) | null }
  onChange: (patch: Partial<ReturnEntry>) => void
}

/**
 * One return: channel and marketplace, the returned product (searched on the server), units and how many were damaged,
 * remarks and name / value details. A batch is several of these.
 */
export function ManualReturnEntryCard({ entry, options, position, onChange }: Props) {
  const markets = options.find((option) => option.id === entry.channel)?.markets ?? []
  const debounced = useDebounce(entry.search.trim(), 300)
  // The listing is read from the API on every search, filtered by channel, marketplace and the typed text
  const { data: products, isFetching } = useGetManualReturnProductsQuery(entry.channel && entry.marketplace && !entry.product ? { channel: entry.channel, marketplace: entry.marketplace, search: debounced } : skipToken)

  const units = count(entry.units)
  const damaged = count(entry.damaged)
  const sellable = units - damaged
  const setDetail = (index: number, patch: Partial<ManualReturnMetadata>) => onChange({ details: entry.details.map((row, i) => (i === index ? { ...row, ...patch } : row)) })

  const changeChannel = (channel: string) => onChange({ channel, marketplace: options.find((option) => option.id === channel)?.markets[0]?.country ?? '', product: null, search: '' })

  return (
    <div className={position ? 'rounded-lg border border-border bg-surface p-4 shadow-sm' : ''}>
      {position && (
        <div className="mb-3 flex items-center gap-3">
          <h3 className="text-sm font-semibold text-text-primary">Return {position.index + 1}</h3>
          {position.onRemove && (
            <button type="button" onClick={position.onRemove} aria-label={`Remove return ${position.index + 1}`} className="ml-auto rounded-lg px-2 py-1 text-sm text-text-subtle hover:bg-secondary-100 hover:text-danger-600">
              Remove
            </button>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Channel" value={entry.channel} onChange={(event) => changeChannel(event.target.value)} options={options.map((option) => ({ value: option.id, label: option.label }))} />
          <Select
            label="Marketplace"
            value={entry.marketplace}
            onChange={(event) => onChange({ marketplace: event.target.value, product: null, search: '' })}
            options={markets.map((market) => ({ value: market.country, label: `${market.label} (${market.country})` }))}
          />
        </div>

        <div>
          <div className="mb-1 text-sm font-medium text-text-primary">
            Product <span className="font-normal text-text-muted">· the channel&apos;s listings that are mapped to our products</span>
          </div>
          {entry.product ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-success-200 bg-success-50 px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-success-800">{entry.product.name}</div>
                <div className="truncate font-mono text-xs text-success-700">
                  {entry.product.channelSku} → {entry.product.components.map((component) => `${component.sku} × ${component.quantity}`).join(', ')}
                </div>
              </div>
              <button type="button" onClick={() => onChange({ product: null, search: '' })} className="shrink-0 text-sm font-medium text-text-muted underline hover:text-text-primary">
                Change
              </button>
            </div>
          ) : (
            <>
              <Input value={entry.search} onChange={(event) => onChange({ search: event.target.value })} placeholder="Search by SKU or product name" />
              <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-border">
                {isFetching && !products ? (
                  <div className="flex justify-center p-4">
                    <Spinner size="sm" />
                  </div>
                ) : !products?.length ? (
                  <p className="p-4 text-sm text-text-muted">{debounced ? 'No mapped listing matches.' : 'No mapped listings for this channel and marketplace. Map them in SKU Mapping first.'}</p>
                ) : (
                  <div className={isFetching ? 'opacity-60 transition-opacity' : undefined}>
                    {products.map((item) => (
                      <button key={item.channelSku} type="button" onClick={() => onChange({ product: item })} className="block w-full border-b border-border px-4 py-2.5 text-left last:border-0 hover:bg-secondary-50">
                        <div className="text-sm font-medium text-text-primary">{item.name}</div>
                        <div className="font-mono text-xs text-text-muted">
                          {item.channelSku}
                          {item.components.length > 1 ? ` · ${item.components.length} products` : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="Units returned" inputMode="numeric" value={entry.units} onChange={(event) => onChange({ units: digits(event.target.value) })} />
          <Input label="How many were damaged?" inputMode="numeric" value={entry.damaged} onChange={(event) => onChange({ damaged: digits(event.target.value) })} error={damaged > units ? 'More than came back' : undefined} />
          <div>
            <div className="ds-input-label">Sellable · what is left</div>
            <div className={`flex h-10 items-center rounded-lg border border-border bg-secondary-50 px-3 text-sm font-bold ${sellable < 0 ? 'text-danger-600' : 'text-success-700'}`}>{Math.max(sellable, 0)}</div>
          </div>
        </div>

        <Textarea label="Remarks (optional)" rows={2} value={entry.remarks} onChange={(event) => onChange({ remarks: event.target.value })} maxLength={1000} />

        <div>
          <div className="mb-1 text-sm font-medium text-text-primary">
            Extra details <span className="font-normal text-text-muted">· optional name and value pairs, e.g. RMA number, carrier, condition notes</span>
          </div>
          <div className="space-y-2">
            {entry.details.map((detail, index) => (
              <div key={index} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
                <Input aria-label="Detail name" placeholder="Name" value={detail.name} maxLength={60} onChange={(event) => setDetail(index, { name: event.target.value })} />
                <Input aria-label="Detail value" placeholder="Value" value={detail.value} maxLength={500} onChange={(event) => setDetail(index, { value: event.target.value })} />
                <Button type="button" variant="outline" aria-label="Remove detail" onClick={() => onChange({ details: entry.details.filter((_, i) => i !== index) })}>
                  ✕
                </Button>
              </div>
            ))}
            {entry.details.length < 20 && (
              <Button type="button" variant="outline" size="sm" onClick={() => onChange({ details: [...entry.details, { name: '', value: '' }] })}>
                ＋ Add detail
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
