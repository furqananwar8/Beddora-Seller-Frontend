'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
  useLazyGetManualReturnOrderLinesQuery,
  type ManualReturnMetadata,
  type ManualReturnOrder,
  type ManualReturnProduct,
} from '@/services/api/barcode.api'

/** A plain channel return (FBA: pick the listing) or a return for a seller-fulfilled order (FBM: find the order, pick its line). */
type ReturnKind = 'FBA' | 'FBM'
const KINDS: Array<{ value: ReturnKind; label: string }> = [
  { value: 'FBA', label: 'Channel return (FBA)' },
  { value: 'FBM', label: 'Order return (FBM)' },
]

interface Props {
  onClose: () => void
}

/** One returned product with its own counts; a return can carry several of these for the same channel and marketplace. */
interface Item {
  key: number
  product: ManualReturnProduct | null
  /** Units of the picked order line still out (FBM only); caps how many can be returned. */
  remaining: number | null
  units: string
  damaged: string
}

const newItem = (key: number): Item => ({ key, product: null, remaining: null, units: '1', damaged: '0' })
const digits = (value: string) => value.replace(/[^0-9]/g, '')
const count = (value: string) => Number(digits(value)) || 0

const itemProblem = (item: Item, kind: ReturnKind, hasOrder: boolean): string | null => {
  const units = count(item.units)
  if (!item.product) return kind === 'FBM' ? (hasOrder ? 'Pick the returned item from the order' : 'Find the order first') : 'Pick the returned product'
  if (units < 1) return 'Enter how many units came back'
  if (item.remaining !== null && units > item.remaining) return `Only ${item.remaining} unit${item.remaining === 1 ? ' is' : 's are'} left to return on this order`
  if (count(item.damaged) > units) return 'More units are marked damaged than came back'
  return null
}

interface RowProps {
  index: number
  item: Item
  kind: ReturnKind
  channel: string
  marketplace: string
  order: ManualReturnOrder | null
  /** Channel SKUs already picked on other rows, so one listing is not entered twice. */
  taken: Set<string>
  onChange: (patch: Partial<Item>) => void
  onRemove?: () => void
}

/** The product pick and the three counts for one returned item. */
function ItemRow({ index, item, kind, channel, marketplace, order, taken, onChange, onRemove }: RowProps) {
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search.trim(), 300)
  const { product } = item
  const { data, isFetching } = useGetManualReturnProductsQuery(kind === 'FBA' && channel && marketplace && !product ? { channel, marketplace, search: debounced } : skipToken)
  const products = data?.filter((entry) => !taken.has(entry.channelSku))

  const unitCount = count(item.units)
  const damagedCount = count(item.damaged)
  const sellableCount = unitCount - damagedCount

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-text-primary">
          Product {index + 1}{' '}
          <span className="font-normal text-text-muted">{kind === 'FBM' ? "· an item on the order" : "· the channel's listings that are mapped to our products"}</span>
        </div>
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-sm font-medium text-text-muted underline hover:text-danger-600">
            Remove
          </button>
        )}
      </div>

      {product ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-success-200 bg-success-50 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-success-800">{product.name}</div>
            <div className="truncate font-mono text-xs text-success-700">
              {product.channelSku} → {product.components.map((component) => `${component.sku} × ${component.quantity}`).join(', ')}
            </div>
          </div>
          <button type="button" onClick={() => onChange({ product: null, remaining: null })} className="shrink-0 text-sm font-medium text-text-muted underline hover:text-text-primary">
            Change
          </button>
        </div>
      ) : kind === 'FBM' ? (
        order ? (
          <div className="max-h-56 overflow-auto rounded-lg border border-border">
            {order.lines.map((line) => {
              const disabled = !line.mapped || line.remaining === 0 || taken.has(line.channelSku)
              return (
                <button
                  key={line.channelSku}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ product: { channelSku: line.channelSku, name: line.name, components: line.components }, remaining: line.remaining, units: String(Math.min(count(item.units) || 1, line.remaining)) })}
                  className="block w-full border-b border-border px-4 py-2.5 text-left last:border-0 hover:bg-secondary-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="text-sm font-medium text-text-primary">{line.name}</div>
                  <div className="font-mono text-xs text-text-muted">
                    {line.channelSku} · {line.remaining} of {line.ordered} left to return
                    {!line.mapped ? ' · not mapped in SKU Mapping' : ''}
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-text-muted">Find the order above first.</p>
        )
      ) : (
        <>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by SKU" />
          <div className="max-h-56 overflow-auto rounded-lg border border-border">
            {isFetching && !data ? (
              <div className="flex justify-center p-4">
                <Spinner size="sm" />
              </div>
            ) : !products?.length ? (
              <p className="p-4 text-sm text-text-muted">{debounced ? 'No mapped listing matches.' : 'No mapped listings for this channel and marketplace. Map them in SKU Mapping first.'}</p>
            ) : (
              products.map((entry) => (
                <button key={entry.channelSku} type="button" onClick={() => onChange({ product: entry })} className="block w-full border-b border-border px-4 py-2.5 text-left last:border-0 hover:bg-secondary-50">
                  <div className="text-sm font-medium text-text-primary">{entry.name}</div>
                  <div className="font-mono text-xs text-text-muted">
                    {entry.channelSku}
                    {entry.components.length > 1 ? ` · ${entry.components.length} products` : ''}
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input label="Units returned" inputMode="numeric" value={item.units} onChange={(event) => onChange({ units: digits(event.target.value) })} />
        <Input label="How many were damaged?" inputMode="numeric" value={item.damaged} onChange={(event) => onChange({ damaged: digits(event.target.value) })} error={damagedCount > unitCount ? 'More than came back' : undefined} />
        <div>
          <div className="ds-input-label">Sellable · what is left</div>
          <div className={`flex h-10 items-center rounded-lg border border-border bg-secondary-50 px-3 text-sm font-bold ${sellableCount < 0 ? 'text-danger-600' : 'text-success-700'}`}>{Math.max(sellableCount, 0)}</div>
        </div>
      </div>
    </div>
  )
}

/**
 * A return entered by hand, for returned items that match nothing by UPC. Channel and marketplace narrow the listings; the
 * person adds one row per returned product (or, for an FBM return, finds the order and picks its lines), each with how many
 * units came back and how many were damaged (the rest are sellable). Remarks and name / value details apply to every row.
 * Saving puts the units back into inventory.
 */
export function ManualReturnModal({ onClose }: Props) {
  const feedback = useApiFeedback()
  const { data: options, isLoading: loadingOptions } = useGetManualReturnOptionsQuery()
  const [create, { isLoading: saving }] = useCreateManualReturnMutation()

  const [kind, setKind] = useState<ReturnKind>('FBA')
  const [findOrder, { isFetching: findingOrder }] = useLazyGetManualReturnOrderLinesQuery()
  const [orderNo, setOrderNo] = useState('')
  const [order, setOrder] = useState<ManualReturnOrder | null>(null)
  const [channel, setChannel] = useState('')
  const [marketplace, setMarketplace] = useState('')
  const nextKey = useRef(1)
  const [items, setItems] = useState<Item[]>([newItem(0)])
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
  const problem = items.map((item, index) => ({ index, text: itemProblem(item, kind, Boolean(order)) })).find((entry) => entry.text)
  const namedDetails = details.filter((detail) => detail.name.trim())

  /** Whatever was picked belongs to the channel, marketplace and kind it was picked under, so changing one starts the picks over. */
  const resetPick = () => {
    setOrder(null)
    setItems([newItem(nextKey.current++)])
  }
  const changeKind = (value: ReturnKind) => {
    setKind(value)
    resetPick()
  }
  const changeChannel = (value: string) => {
    setChannel(value)
    setMarketplace(options?.find((option) => option.id === value)?.markets[0]?.country ?? '')
    resetPick()
  }
  const changeMarketplace = (value: string) => {
    setMarketplace(value)
    resetPick()
  }
  const lookUpOrder = async () => {
    try {
      setOrder(await findOrder({ channel, marketplace, orderId: orderNo.trim() }).unwrap())
      setItems([newItem(nextKey.current++)])
    } catch (error) {
      setOrder(null)
      feedback.failure(error, 'Could not find that order')
    }
  }
  const patchItem = (key: number, patch: Partial<Item>) => setItems((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  const setDetail = (index: number, patch: Partial<ManualReturnMetadata>) => setDetails((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))

  const save = async () => {
    if (problem) return
    // One request per row; stop at the first failure and keep the rows that did not save, so a retry never doubles a saved one.
    let saved = 0
    let savedUnits = 0
    for (const item of items) {
      try {
        await create({
          channel,
          marketplace,
          channelSku: item.product!.channelSku,
          ...(kind === 'FBM' && order ? { orderId: order.orderId } : {}),
          units: count(item.units),
          damagedUnits: count(item.damaged),
          remarks: remarks.trim() || undefined,
          metadata: namedDetails.map((detail) => ({ name: detail.name.trim(), value: detail.value.trim() })),
        }).unwrap()
        saved += 1
        savedUnits += count(item.units)
      } catch (error) {
        setItems((rows) => rows.slice(saved))
        if (saved) feedback.success(`${saved} return${saved === 1 ? '' : 's'} recorded before the error`)
        feedback.failure(error, `Could not save ${item.product!.channelSku}`)
        return
      }
    }
    feedback.success(`${saved} return${saved === 1 ? '' : 's'} recorded: ${savedUnits} unit${savedUnits === 1 ? '' : 's'} added to inventory`)
    onClose()
  }

  return (
    <Modal isOpen onClose={onClose} title="Manual return" size="xl">
      <p className="-mt-2 mb-4 text-sm text-text-muted">For returned items that match nothing by UPC. The units go back into inventory when you save.</p>

      {loadingOptions || !options ? (
        <div className="flex justify-center p-8">
          <Spinner size="sm" />
        </div>
      ) : (
        <div className="space-y-4">
          <div role="radiogroup" aria-label="Kind of return" className="inline-flex rounded-lg border border-border p-0.5">
            {KINDS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={kind === option.value}
                onClick={() => changeKind(option.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${kind === option.value ? 'bg-primary-600 text-white' : 'text-text-secondary hover:bg-secondary-50'}`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Channel" value={channel} onChange={(event) => changeChannel(event.target.value)} options={options.map((option) => ({ value: option.id, label: option.label }))} />
            <Select label="Marketplace" value={marketplace} onChange={(event) => changeMarketplace(event.target.value)} options={markets.map((market) => ({ value: market.country, label: `${market.label} (${market.country})` }))} />
          </div>

          {kind === 'FBM' && (
            <div>
              <div className="mb-1 text-sm font-medium text-text-primary">
                Order <span className="font-normal text-text-muted">· the order the items were sent on; only a shipped order can be returned</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    value={orderNo}
                    onChange={(event) => {
                      setOrderNo(event.target.value)
                      setOrder(null)
                    }}
                    onKeyDown={(event) => event.key === 'Enter' && orderNo.trim() && void lookUpOrder()}
                    placeholder="Order number"
                    autoFocus
                  />
                </div>
                <Button type="button" variant="outline" onClick={() => void lookUpOrder()} disabled={!orderNo.trim() || findingOrder}>
                  {findingOrder ? 'Finding…' : 'Find order'}
                </Button>
              </div>
              {order && <div className="mt-1 text-xs font-semibold text-secondary-600">Order {order.ref}</div>}
            </div>
          )}

          <div className="space-y-3">
            {items.map((item, index) => (
              <ItemRow
                key={item.key}
                index={index}
                item={item}
                kind={kind}
                channel={channel}
                marketplace={marketplace}
                order={order}
                taken={new Set(items.filter((other) => other.key !== item.key && other.product).map((other) => other.product!.channelSku))}
                onChange={(patch) => patchItem(item.key, patch)}
                onRemove={items.length > 1 ? () => setItems((rows) => rows.filter((row) => row.key !== item.key)) : undefined}
              />
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setItems((rows) => [...rows, newItem(nextKey.current++)])}>
              ＋ Add another product
            </Button>
          </div>

          <Textarea label="Remarks (optional) · applied to every product above" rows={3} value={remarks} onChange={(event) => setRemarks(event.target.value)} maxLength={1000} />

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
              `Product ${problem.index + 1}: ${problem.text}`
            ) : (
              <>
                <b className="text-text-primary">On save:</b> {items.length} return{items.length === 1 ? '' : 's'} are recorded and their sellable units go to the FBM pool, damaged ones to the damaged bucket. Each entry is kept with your name and the time.
              </>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving || Boolean(problem)}>
              {saving ? 'Saving…' : items.length > 1 ? `Save ${items.length} returns` : 'Save return'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
