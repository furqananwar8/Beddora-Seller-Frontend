"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { cn } from '@/utils/cn'
import { InboundShipment, Marketplace, ReservedPoolItem } from './types'
import { CreateShipmentInput } from './useShipments'
import { MARKETPLACE_META } from './workflow'
import { ProductThumb, formatUnits } from './ShipmentParts'

interface CreateShipmentDrawerProps {
  isOpen: boolean
  onClose: () => void
  pool: ReservedPoolItem[]
  /** Unassigned reserved units per product. */
  unassigned: Record<string, number>
  /** Pre-selected products, e.g. from the Planner selection. */
  initialProductIds?: string[]
  onCreate: (input: CreateShipmentInput) => Promise<InboundShipment>
}

type Lines = Record<string, { selected: boolean; quantity: number }>

const defaultName = (marketplace: Marketplace) => {
  const d = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date())
  return `FBA ${MARKETPLACE_META[marketplace].label} · ${d}`
}

export const CreateShipmentDrawer: React.FC<CreateShipmentDrawerProps> = ({
  isOpen,
  onClose,
  pool,
  unassigned,
  initialProductIds = [],
  onCreate,
}) => {
  const marketplaces = useMemo(
    () => Array.from(new Set(pool.map((p) => p.marketplace))),
    [pool]
  )
  const [marketplace, setMarketplace] = useState<Marketplace>('Amazon.ca')
  const [name, setName] = useState('')
  const [search, setSearch] = useState('')
  const [lines, setLines] = useState<Lines>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset every time the drawer opens.
  useEffect(() => {
    if (!isOpen) return
    const preselected = pool.filter(
      (p) => initialProductIds.includes(p.productId) && (unassigned[p.productId] ?? 0) > 0
    )
    const mp = preselected[0]?.marketplace ?? marketplaces[0] ?? 'Amazon.ca'
    setMarketplace(mp)
    setName(defaultName(mp))
    setSearch('')
    setLines(
      Object.fromEntries(
        preselected.map((p) => [p.productId, { selected: true, quantity: unassigned[p.productId] }])
      )
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !isSubmitting && onClose()
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen, isSubmitting, onClose])

  const available = useMemo(
    () => pool.filter((p) => p.marketplace === marketplace && (unassigned[p.productId] ?? 0) > 0),
    [pool, marketplace, unassigned]
  )

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return available
    return available.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.asin.toLowerCase().includes(q)
    )
  }, [available, search])

  const selected = available.filter((p) => lines[p.productId]?.selected)
  const totalUnits = selected.reduce((s, p) => s + (lines[p.productId]?.quantity || 0), 0)
  const invalid = selected.some((p) => {
    const q = lines[p.productId].quantity
    return !Number.isInteger(q) || q < 1 || q > (unassigned[p.productId] ?? 0)
  })
  const canSubmit = selected.length > 0 && !invalid && name.trim().length > 0 && !isSubmitting

  const allVisibleSelected = visible.length > 0 && visible.every((p) => lines[p.productId]?.selected)

  const toggle = (p: ReservedPoolItem, on: boolean) =>
    setLines((prev) => ({
      ...prev,
      [p.productId]: { selected: on, quantity: prev[p.productId]?.quantity ?? unassigned[p.productId] },
    }))

  const toggleAll = (on: boolean) =>
    setLines((prev) => {
      const next = { ...prev }
      visible.forEach((p) => {
        next[p.productId] = { selected: on, quantity: prev[p.productId]?.quantity ?? unassigned[p.productId] }
      })
      return next
    })

  const setQty = (productId: string, quantity: number) =>
    setLines((prev) => ({ ...prev, [productId]: { selected: true, quantity } }))

  const changeMarketplace = (mp: Marketplace) => {
    // Items can't span marketplaces; an inbound plan targets one.
    setMarketplace(mp)
    setLines({})
    if (!name || name === defaultName(marketplace)) setName(defaultName(mp))
  }

  const handleCreate = async () => {
    setIsSubmitting(true)
    try {
      await onCreate({
        name: name.trim(),
        marketplace,
        items: selected.map((p) => ({
          productId: p.productId,
          sku: p.sku,
          fnsku: p.fnsku,
          asin: p.asin,
          title: p.title,
          imageUrl: p.imageUrl,
          quantity: lines[p.productId].quantity,
        })),
      })
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="create-shipment-title">
      <div className="absolute inset-0 bg-black/40" onClick={() => !isSubmitting && onClose()} />

      <div className="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col border-l border-border bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-6 py-5">
          <div>
            <h2 id="create-shipment-title" className="text-lg font-semibold text-text-primary">
              New FBA shipment
            </h2>
            <p className="mt-0.5 text-sm text-text-muted">
              Split your FBA reserved stock into a shipment. It stays an internal draft until you send it to Amazon.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
            className="rounded p-1.5 text-text-muted hover:bg-secondary-100 hover:text-text-primary"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-text-muted">Shipment name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-200"
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-medium text-text-muted">Marketplace</span>
              <select
                value={marketplace}
                onChange={(e) => changeMarketplace(e.target.value as Marketplace)}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-200"
              >
                {(Object.keys(MARKETPLACE_META) as Marketplace[]).map((mp) => (
                  <option key={mp} value={mp} disabled={!marketplaces.includes(mp)}>
                    {MARKETPLACE_META[mp].flag} {mp}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="flex items-center gap-3 border-b border-border bg-secondary-50 px-4 py-2.5">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={(e) => toggleAll(e.target.checked)}
                aria-label="Select all products"
                disabled={visible.length === 0}
              />
              <input
                type="search"
                placeholder="Search products, SKU, ASIN"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary-200"
              />
              <span className="whitespace-nowrap text-xs text-text-muted">
                {available.length} with unassigned stock
              </span>
            </div>

            {visible.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-text-muted">
                {available.length === 0
                  ? 'All FBA reserved stock for this marketplace is already assigned to shipments. Allocate more in the Planner.'
                  : 'No products match your search.'}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {visible.map((p) => {
                  const line = lines[p.productId]
                  const max = unassigned[p.productId] ?? 0
                  const qty = line?.quantity ?? max
                  const bad = line?.selected && (!Number.isInteger(qty) || qty < 1 || qty > max)
                  return (
                    <li
                      key={p.productId}
                      className={cn('flex items-center gap-3 px-4 py-3', line?.selected && 'bg-secondary-50/60')}
                    >
                      <input
                        type="checkbox"
                        checked={!!line?.selected}
                        onChange={(e) => toggle(p, e.target.checked)}
                        aria-label={`Select ${p.sku}`}
                      />
                      <ProductThumb src={p.imageUrl} alt={p.title} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-text-primary">{p.title}</div>
                        <div className="text-xs text-text-muted">
                          <span className="font-mono">{p.sku}</span> · {p.asin}
                        </div>
                      </div>
                      <div className="text-right text-xs text-text-muted">
                        <div>
                          <span className="font-semibold text-text-primary">{formatUnits(max)}</span> unassigned
                        </div>
                        <div>{formatUnits(p.reserved)} reserved</div>
                      </div>
                      <div className="flex flex-col items-end">
                        <input
                          type="number"
                          min={1}
                          max={max}
                          step={1}
                          value={Number.isNaN(qty) ? '' : qty}
                          onChange={(e) => setQty(p.productId, e.target.valueAsNumber)}
                          aria-label={`Quantity for ${p.sku}`}
                          aria-invalid={!!bad}
                          className={cn(
                            'w-24 rounded-md border px-2 py-1 text-right text-sm font-semibold focus:outline-none focus:ring-2',
                            bad ? 'border-danger-400 focus:ring-danger-200' : 'border-border focus:ring-secondary-200',
                            !line?.selected && 'text-text-subtle'
                          )}
                        />
                        {bad && <span className="mt-0.5 text-[11px] text-danger-600">1 – {formatUnits(max)}</span>}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-secondary-50 px-6 py-4">
          <div className="text-sm text-text-muted">
            <span className="font-semibold text-text-primary">{selected.length}</span> SKU{selected.length !== 1 && 's'} ·{' '}
            <span className="font-semibold text-text-primary">{formatUnits(totalUnits)}</span> units
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!canSubmit}>
              {isSubmitting ? (
                <span className="flex items-center gap-2"><Spinner size="sm" className="text-white" /> Creating…</span>
              ) : (
                'Create draft shipment'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
