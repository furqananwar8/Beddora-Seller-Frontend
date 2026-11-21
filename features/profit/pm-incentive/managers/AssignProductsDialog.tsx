'use client'

import React, { useMemo, useState } from 'react'
import { ChoiceSelect } from '@/components/choice-select/ChoiceSelect'
import { SelectionCheckbox } from '@/components/selection-checkbox/SelectionCheckbox'
import { Badge } from '@/design-system/badges'
import { Button } from '@/design-system/buttons'
import { Modal } from '@/design-system/modals'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import {
  skusOn,
  useAssignManagerProductsMutation,
  useGetManagerChannelSkusQuery,
  useGetManagerChannelsQuery,
  useGetProductManagersQuery,
  type ProductManager,
} from '@/services/api/productManagers.api'
import { cn } from '@/utils/cn'

interface AssignProductsDialogProps {
  /** The manager the products go to; null closes the dialog. */
  manager: ProductManager | null
  onClose: () => void
}

type View = 'all' | 'free' | 'taken' | 'picked'

const VIEWS = [
  { value: 'all' as const, label: 'All products' },
  { value: 'free' as const, label: 'Not managed by anyone' },
  { value: 'taken' as const, label: 'Managed by others' },
  { value: 'picked' as const, label: 'Picked for this manager' },
]

/** First rows drawn per list; the rest appear with "Show more" so a catalogue of thousands stays quick. */
const PAGE = 150

const keyOf = (channel: string, sku: string) => `${channel}|${sku}`
const splitKey = (key: string) => {
  const at = key.indexOf('|')
  return { channel: key.slice(0, at), sku: key.slice(at + 1) }
}

/** Picks, on any number of channels, the products a manager looks after. A wide two-pane view: browse on the left, review the pick on the right. */
export const AssignProductsDialog: React.FC<AssignProductsDialogProps> = ({ manager, onClose }) => (
  <Modal isOpen={manager !== null} onClose={onClose} title={manager ? `Assign products to ${manager.name}` : 'Assign products'} size="2xl">
    {manager && <AssignForm key={manager.id} manager={manager} onClose={onClose} />}
  </Modal>
)

const AssignForm: React.FC<{ manager: ProductManager; onClose: () => void }> = ({ manager, onClose }) => {
  const { success, failure } = useApiFeedback()
  const [assign, { isLoading: isSaving }] = useAssignManagerProductsMutation()
  const { data: channels = [] } = useGetManagerChannelsQuery()
  const { data: everyone = [] } = useGetProductManagersQuery()

  const initial = useMemo(() => new Set(manager.products.flatMap(({ channel, skus }) => skus.map((sku) => keyOf(channel, sku)))), [manager])
  const [picked, setPicked] = useState<Set<string>>(initial)

  const [chosenChannel, setChosenChannel] = useState<string | null>(null)
  const activeChannel = chosenChannel ?? manager.products.find((group) => group.skus.length > 0)?.channel ?? channels[0]?.id ?? ''
  const [search, setSearch] = useState('')
  const [view, setView] = useState<View>('all')
  const [shown, setShown] = useState(PAGE)

  const { data: listed = [], isFetching, isError, refetch } = useGetManagerChannelSkusQuery(activeChannel, { skip: !activeChannel })

  // Who else manages what, per channel (a product has one manager per channel)
  const ownerOf = useMemo(() => {
    const owners = new Map<string, string>()
    for (const other of everyone) {
      if (other.id === manager.id) continue
      for (const { channel, skus } of other.products) for (const sku of skus) owners.set(keyOf(channel, sku), other.name)
    }
    return owners
  }, [everyone, manager.id])

  const channelName = (id: string) => channels.find((channel) => channel.id === id)?.name ?? id

  // SKUs the manager already has stay listed even when the channel no longer lists them
  const rows = useMemo(() => {
    const known = new Set(listed.map((option) => option.sku))
    const kept = skusOn(manager, activeChannel).filter((sku) => !known.has(sku)).map((sku) => ({ sku, title: '' }))
    const needle = search.trim().toLowerCase()
    return [...listed, ...kept].filter((option) => {
      const key = keyOf(activeChannel, option.sku)
      if (needle && !option.sku.toLowerCase().includes(needle) && !option.title.toLowerCase().includes(needle)) return false
      if (view === 'free') return !ownerOf.has(key)
      if (view === 'taken') return ownerOf.has(key)
      if (view === 'picked') return picked.has(key)
      return true
    })
  }, [listed, manager, activeChannel, search, view, ownerOf, picked])

  const visible = rows.slice(0, shown)
  const rowKeys = rows.map((row) => keyOf(activeChannel, row.sku))
  const pickedInRows = rowKeys.filter((key) => picked.has(key)).length
  const allRowsPicked = rows.length > 0 && pickedInRows === rows.length

  const toggle = (key: string) =>
    setPicked((current) => {
      const next = new Set(current)
      if (!next.delete(key)) next.add(key)
      return next
    })
  const setMany = (keys: string[], on: boolean) =>
    setPicked((current) => {
      const next = new Set(current)
      for (const key of keys) {
        if (on) next.add(key)
        else next.delete(key)
      }
      return next
    })

  const pickedByChannel = useMemo(() => {
    const groups = new Map<string, string[]>()
    for (const key of picked) {
      const { channel, sku } = splitKey(key)
      groups.set(channel, [...(groups.get(channel) ?? []), sku])
    }
    return [...groups].map(([channel, skus]) => ({ channel, skus: skus.sort() })).sort((a, b) => channelName(a.channel).localeCompare(channelName(b.channel)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, channels])

  const added = [...picked].filter((key) => !initial.has(key)).length
  const removed = [...initial].filter((key) => !picked.has(key)).length
  const takenFromOthers = [...picked].filter((key) => !initial.has(key) && ownerOf.has(key)).length
  const changed = added + removed > 0

  const save = async () => {
    // Only channels whose SKUs differ are sent; a channel emptied out releases its SKUs
    const touched = new Set([...picked, ...initial].map((key) => splitKey(key).channel))
    const assignments = [...touched]
      .map((channel) => ({ channel, skus: pickedByChannel.find((group) => group.channel === channel)?.skus ?? [] }))
      .filter(({ channel, skus }) => {
        const before = skusOn(manager, channel)
        return skus.length !== before.length || skus.some((sku) => !before.includes(sku))
      })
    try {
      await assign({ id: manager.id, assignments }).unwrap()
      success(`${picked.size} ${picked.size === 1 ? 'product' : 'products'} assigned to ${manager.name}`)
      onClose()
    } catch (error) {
      failure(error, 'Could not assign the products')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid h-[62vh] min-h-[420px] gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Browse */}
        <section className="flex min-h-0 flex-col rounded-lg border border-border">
          <div className="flex flex-wrap gap-1.5 border-b border-border p-3" role="tablist" aria-label="Channel">
            {channels.map(({ id, name }) => {
              const count = [...picked].filter((key) => splitKey(key).channel === id).length
              const active = id === activeChannel
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setChosenChannel(id)
                    setShown(PAGE)
                  }}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors',
                    active ? 'border-primary-600 bg-primary-600 text-white' : 'border-border bg-surface text-text-primary hover:bg-secondary-50',
                  )}
                >
                  {name}
                  {count > 0 && <span className={cn('rounded-full px-1.5 text-xs', active ? 'bg-white/25' : 'bg-primary-50 text-primary-700')}>{count}</span>}
                </button>
              )
            })}
          </div>

          <div className="grid gap-2 border-b border-border p-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setShown(PAGE)
              }}
              placeholder="Search by SKU or title..."
              aria-label="Search products"
              className="ds-input ds-input-default rounded-lg"
            />
            <ChoiceSelect
              title="Show"
              value={view}
              onChange={(next) => {
                setView(next)
                setShown(PAGE)
              }}
              options={VIEWS}
            />
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-border bg-secondary-50 px-3 py-2 text-sm">
            <label className="flex cursor-pointer items-center gap-2 font-medium text-text-primary">
              <SelectionCheckbox
                checked={allRowsPicked}
                indeterminate={pickedInRows > 0 && !allRowsPicked}
                onChange={() => setMany(rowKeys, !allRowsPicked)}
                label={`Select all ${rows.length} listed products`}
              />
              {allRowsPicked ? 'Clear' : 'Select'} all {rows.length} listed
            </label>
            <span className="text-xs text-text-muted">{pickedInRows} picked here</span>
          </div>

          <ul className="min-h-0 flex-1 overflow-y-auto">
            {isFetching && listed.length === 0 ? (
              <li className="p-6 text-center text-sm text-text-muted">Loading products...</li>
            ) : isError ? (
              <li className="grid justify-items-center gap-2 p-6 text-center text-sm text-danger-700">
                Could not load the products of {channelName(activeChannel)}.
                <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
                  Try again
                </Button>
              </li>
            ) : rows.length === 0 ? (
              <li className="p-6 text-center text-sm text-text-muted">{search || view !== 'all' ? 'No products match.' : `${channelName(activeChannel)} lists no products.`}</li>
            ) : (
              <>
                {visible.map((row) => {
                  const key = keyOf(activeChannel, row.sku)
                  const on = picked.has(key)
                  const owner = ownerOf.get(key)
                  return (
                    <li key={key} className="border-b border-border/60 last:border-0">
                      <label className={cn('flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-secondary-50', on && 'bg-primary-50/50')}>
                        <SelectionCheckbox checked={on} onChange={() => toggle(key)} label={`Pick ${row.sku}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-mono text-sm font-medium text-text-primary">{row.sku}</span>
                          {row.title && <span className="block truncate text-xs text-text-muted">{row.title}</span>}
                        </span>
                        {owner && (
                          <Badge variant={on ? 'warning' : 'secondary'} size="sm">
                            {on ? `Takes from ${owner}` : `Managed by ${owner}`}
                          </Badge>
                        )}
                      </label>
                    </li>
                  )
                })}
                {rows.length > shown && (
                  <li className="p-3 text-center">
                    <Button type="button" size="sm" variant="outline" onClick={() => setShown((count) => count + PAGE)}>
                      Show more ({rows.length - shown} left)
                    </Button>
                  </li>
                )}
              </>
            )}
          </ul>
        </section>

        {/* Review */}
        <section className="flex min-h-0 flex-col rounded-lg border border-border">
          <div className="flex items-center justify-between gap-2 border-b border-border p-3">
            <h3 className="text-sm font-semibold text-text-primary">
              Picked for {manager.name} <span className="font-normal text-text-muted">({picked.size})</span>
            </h3>
            <Button type="button" size="sm" variant="outline" disabled={picked.size === 0} onClick={() => setPicked(new Set())}>
              Clear all
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {pickedByChannel.length === 0 ? (
              <p className="py-10 text-center text-sm text-text-muted">No products picked yet. Tick products on the left to assign them.</p>
            ) : (
              <div className="grid gap-4">
                {pickedByChannel.map(({ channel, skus }) => (
                  <div key={channel}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                        {channelName(channel)} · {skus.length}
                      </h4>
                      <button type="button" className="text-xs text-primary-600 hover:underline" onClick={() => setMany(skus.map((sku) => keyOf(channel, sku)), false)}>
                        Remove all
                      </button>
                    </div>
                    <ul className="flex flex-wrap gap-1.5">
                      {skus.map((sku) => (
                        <li key={sku} className="flex items-center gap-1 rounded border border-border bg-surface-secondary py-0.5 pl-2 pr-1 font-mono text-xs text-text-primary">
                          {sku}
                          <button type="button" aria-label={`Remove ${sku}`} onClick={() => toggle(keyOf(channel, sku))} className="rounded px-1 text-text-muted hover:bg-danger-50 hover:text-danger-700">
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-muted">
          {changed ? (
            <>
              <span className="font-medium text-success-700">+{added} added</span> · <span className="font-medium text-danger-700">−{removed} removed</span>
              {takenFromOthers > 0 && <> · {takenFromOthers} taken from other managers (a product has one manager per channel)</>}
            </>
          ) : (
            'No changes yet.'
          )}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={save} isLoading={isSaving} disabled={!changed}>
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}
