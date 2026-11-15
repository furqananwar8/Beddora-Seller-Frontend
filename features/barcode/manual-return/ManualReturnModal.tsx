'use client'

import { useEffect, useMemo, useState } from 'react'
import { skipToken } from '@reduxjs/toolkit/query'
import { Button } from '@/design-system/buttons'
import { Input, Select, Textarea } from '@/design-system/inputs'
import { Spinner } from '@/design-system/loaders'
import { Modal } from '@/design-system/modals'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useDebounce } from '@/utils/debounce'
import {
  useCreateManualReturnMutation,
  useGetManualReturnOptionsQuery,
  useGetManualReturnProductsQuery,
  type ManualReturnMetadata,
  type ManualReturnProduct,
} from '@/services/api/barcode.api'

interface Props {
  onClose: () => void
}

const digits = (value: string) => value.replace(/[^0-9]/g, '')
const count = (value: string) => Number(digits(value)) || 0

/**
 * A return entered by hand, for a returned item that matches nothing by UPC. Channel and marketplace narrow the listings,
 * the person picks the one that came back, says how many units and how many of them were damaged (the rest are sellable),
 * and may add remarks and name / value details. Saving puts the units back into inventory.
 */
export function ManualReturnModal({ onClose }: Props) {
  const feedback = useApiFeedback()
  const { data: options, isLoading: loadingOptions } = useGetManualReturnOptionsQuery()
  const [create, { isLoading: saving }] = useCreateManualReturnMutation()

  const [channel, setChannel] = useState('')
  const [marketplace, setMarketplace] = useState('')
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search.trim(), 300)
  const [product, setProduct] = useState<ManualReturnProduct | null>(null)
  const [units, setUnits] = useState('1')
  const [damaged, setDamaged] = useState('0')
  const [remarks, setRemarks] = useState('')
  const [details, setDetails] = useState<ManualReturnMetadata[]>([])

  // start on the first channel and its first marketplace
  useEffect(() => {
    if (options?.length && !channel) {
      setChannel(options[0].id)
      setMarketplace(options[0].markets[0]?.country ?? '')
    }
  }, [options, channel])

  const markets = useMemo(() => options?.find((option) => option.id === channel)?.markets ?? [], [options, channel])
  const { data: products, isFetching: loadingProducts } = useGetManualReturnProductsQuery(channel && marketplace && !product ? { channel, marketplace, search: debounced } : skipToken)

  const unitCount = count(units)
  const damagedCount = count(damaged)
  const sellableCount = unitCount - damagedCount
  const problem = !product ? 'Pick the returned product' : unitCount < 1 ? 'Enter how many units came back' : damagedCount > unitCount ? 'More units are marked damaged than came back' : null
  const namedDetails = details.filter((detail) => detail.name.trim())

  const changeChannel = (value: string) => {
    setChannel(value)
    setMarketplace(options?.find((option) => option.id === value)?.markets[0]?.country ?? '')
    setProduct(null)
    setSearch('')
  }
  const changeMarketplace = (value: string) => {
    setMarketplace(value)
    setProduct(null)
    setSearch('')
  }
  const setDetail = (index: number, patch: Partial<ManualReturnMetadata>) => setDetails((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))

  const save = async () => {
    if (problem || !product) return
    try {
      await create({
        channel,
        marketplace,
        channelSku: product.channelSku,
        units: unitCount,
        damagedUnits: damagedCount,
        remarks: remarks.trim() || undefined,
        metadata: namedDetails.map((detail) => ({ name: detail.name.trim(), value: detail.value.trim() })),
      }).unwrap()
      feedback.success(`Return recorded: ${unitCount} unit${unitCount === 1 ? '' : 's'} added to inventory`)
      onClose()
    } catch (error) {
      feedback.failure(error, 'Could not save the return')
    }
  }

  const summary = product
    ? product.components.length === 1
      ? `${product.components[0].sku}`
      : `${product.components.length} products`
    : null

  return (
    <Modal isOpen onClose={onClose} title="Manual return" size="lg">
      <p className="-mt-2 mb-4 text-sm text-text-muted">For a returned item that matches nothing by UPC. The units go back into inventory when you save.</p>

      {loadingOptions || !options ? (
        <div className="flex justify-center p-8">
          <Spinner size="sm" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Channel" value={channel} onChange={(event) => changeChannel(event.target.value)} options={options.map((option) => ({ value: option.id, label: option.label }))} />
            <Select label="Marketplace" value={marketplace} onChange={(event) => changeMarketplace(event.target.value)} options={markets.map((market) => ({ value: market.country, label: `${market.label} (${market.country})` }))} />
          </div>

          <div>
            <div className="mb-1 text-sm font-medium text-text-primary">
              Product <span className="font-normal text-text-muted">· the channel&apos;s listings that are mapped to our products</span>
            </div>
            {product ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-success-200 bg-success-50 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-success-800">{product.name}</div>
                  <div className="truncate font-mono text-xs text-success-700">
                    {product.channelSku} → {product.components.map((component) => `${component.sku} × ${component.quantity}`).join(', ')}
                  </div>
                </div>
                <button type="button" onClick={() => setProduct(null)} className="shrink-0 text-sm font-medium text-text-muted underline hover:text-text-primary">
                  Change
                </button>
              </div>
            ) : (
              <>
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by SKU" autoFocus />
                <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-border">
                  {loadingProducts && !products ? (
                    <div className="flex justify-center p-4">
                      <Spinner size="sm" />
                    </div>
                  ) : !products?.length ? (
                    <p className="p-4 text-sm text-text-muted">{debounced ? 'No mapped listing matches.' : 'No mapped listings for this channel and marketplace. Map them in SKU Mapping first.'}</p>
                  ) : (
                    products.map((item) => (
                      <button key={item.channelSku} type="button" onClick={() => setProduct(item)} className="block w-full border-b border-border px-4 py-2.5 text-left last:border-0 hover:bg-secondary-50">
                        <div className="text-sm font-medium text-text-primary">{item.name}</div>
                        <div className="font-mono text-xs text-text-muted">
                          {item.channelSku}
                          {item.components.length > 1 ? ` · ${item.components.length} products` : ''}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="Units returned" inputMode="numeric" value={units} onChange={(event) => setUnits(digits(event.target.value))} />
            <Input label="How many were damaged?" inputMode="numeric" value={damaged} onChange={(event) => setDamaged(digits(event.target.value))} error={damagedCount > unitCount ? 'More than came back' : undefined} />
            <div>
              <div className="ds-input-label">Sellable · what is left</div>
              <div className={`flex h-10 items-center rounded-lg border border-border bg-secondary-50 px-3 text-sm font-bold ${sellableCount < 0 ? 'text-danger-600' : 'text-success-700'}`}>{Math.max(sellableCount, 0)}</div>
            </div>
          </div>

          <Textarea label="Remarks (optional)" rows={3} value={remarks} onChange={(event) => setRemarks(event.target.value)} maxLength={1000} />

          <div>
            <div className="mb-1 text-sm font-medium text-text-primary">
              Extra details <span className="font-normal text-text-muted">· optional name and value pairs, e.g. RMA number, carrier, condition notes</span>
            </div>
            <div className="space-y-2">
              {details.map((detail, index) => (
                <div key={index} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
                  <Input aria-label="Detail name" placeholder="Name" value={detail.name} maxLength={60} onChange={(event) => setDetail(index, { name: event.target.value })} />
                  <Input aria-label="Detail value" placeholder="Value" value={detail.value} maxLength={500} onChange={(event) => setDetail(index, { value: event.target.value })} />
                  <Button type="button" variant="outline" aria-label="Remove detail" onClick={() => setDetails((rows) => rows.filter((_, i) => i !== index))}>
                    ✕
                  </Button>
                </div>
              ))}
              {details.length < 20 && (
                <Button type="button" variant="outline" size="sm" onClick={() => setDetails((rows) => [...rows, { name: '', value: '' }])}>
                  ＋ Add detail
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-secondary-50 p-3 text-sm text-secondary-700">
            {problem ? (
              problem
            ) : (
              <>
                <b className="text-text-primary">On save:</b> {sellableCount} unit{sellableCount === 1 ? '' : 's'} go to the FBM pool as sellable and {damagedCount} to the damaged bucket for {summary}. The entry is kept with your name and the time.
              </>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving || Boolean(problem)}>
              {saving ? 'Saving…' : 'Save return'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
