import React from 'react'
import { AllocationConflict, AllocationSplit, ItemAllocationResult, ProductInventoryItem } from '@/services/api/inventoryPlanner.api'
import { Spinner } from '@/design-system/loaders'
import { cn } from '@/utils/cn'
import { AllocationDrawerModel } from './useAllocationDrawer'
import { Notice, ProductCell, TableFrame, TD, TH, Tile } from './drawerUi'
import { bucketLabel, describeMoves, splitFromBalances } from './allocationMath'

const n = (value: number) => value.toLocaleString()

const Change = ({ before, after }: { before: number; after: number }) =>
  before === after ? (
    <span className="text-slate-600">{n(after)}</span>
  ) : (
    <span className={cn('font-medium', after > before ? 'text-emerald-800' : 'text-red-700')}>
      {n(before)} → {n(after)}
    </span>
  )

const FIELDS: (keyof AllocationSplit)[] = ['fba', 'buffer', 'fbm']

export const ReviewStep: React.FC<{ items: ProductInventoryItem[]; model: AllocationDrawerModel }> = ({ items, model }) => {
  const { state, channelsFor, listingCount, changedCount, preview } = model
  const planned = preview.data?.items ?? []
  const conflicts: AllocationConflict[] = state.conflicts.length > 0 ? state.conflicts : preview.data?.conflicts ?? []

  const planById = new Map<string, ItemAllocationResult>(planned.map((p) => [String(p.inventoryItemId), p]))
  const conflictById = new Map(conflicts.map((c) => [String(c.inventoryItemId), c]))
  const moves = planned.flatMap((p) => p.moves.map((m) => ({ ...m, sku: p.sku })))
  const fbaGains = planned
    .map((p) => ({ sku: p.sku, gain: p.after.FBA_POOL - p.before.FBA_POOL }))
    .filter((g) => g.gain > 0)

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-3">
        <Tile label="Products changed" value={`${changedCount} of ${items.length}`} />
        <Tile label="Stock movements" value={preview.isFetching ? '…' : n(moves.length)} />
        <Tile label="Listings to push" value={n(listingCount)} />
      </div>

      {conflicts.length > 0 && (
        <Notice tone="red" title="These items can't be saved as they are">
          <ul className="flex flex-col gap-0.5">
            {conflicts.map((c) => (
              <li key={c.inventoryItemId}>
                <span className="font-mono">{c.sku || `Item ${c.inventoryItemId}`}</span>: {c.message}
              </li>
            ))}
          </ul>
          <span className="block pt-1 text-slate-700">Close the drawer and reopen it to load the latest stock.</span>
        </Notice>
      )}

      <TableFrame>
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <TH className="w-[280px]">Product</TH>
              <TH>FBA</TH>
              <TH>Buffer</TH>
              <TH>FBM</TH>
              <TH className="w-[200px]">Channels</TH>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const before = splitFromBalances(item.balances)
              const after = state.splits[item.id]
              const plan = planById.get(item.id)
              const conflict = conflictById.get(item.id)
              const channels = channelsFor(item.id).length
              return (
                <tr key={item.id} className={cn('align-top', conflict && 'bg-red-50')}>
                  <TD>
                    <ProductCell
                      title={item.description}
                      sku={item.sku}
                      note={conflict ? conflict.message : plan ? describeMoves(plan.moves) : preview.isFetching ? 'Checking…' : undefined}
                      noteClass={conflict ? 'text-red-700' : undefined}
                    />
                  </TD>
                  {FIELDS.map((field) => (
                    <TD key={field} className="text-[15px]">
                      <Change before={before[field]} after={after[field]} />
                    </TD>
                  ))}
                  <TD className="text-[13px] text-slate-700">
                    {channels === 0 ? 'Not pushed' : `${n(after.fbm)} to ${channels} listing${channels === 1 ? '' : 's'}`}
                  </TD>
                </tr>
              )
            })}
          </tbody>
        </table>
      </TableFrame>

      <div className="flex flex-col gap-2.5">
        <h3 className="text-base font-semibold text-slate-900">Stock movements that will be recorded</h3>
        <TableFrame>
          {preview.isFetching ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-600">
              <Spinner /> Checking the latest stock…
            </div>
          ) : moves.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-600">No stock moves. Saving only pushes the current FBM quantities.</div>
          ) : (
            <table className="w-full border-separate border-spacing-0 font-mono text-[13px] text-slate-900">
              <thead>
                <tr>
                  <TH className="bg-slate-50 font-medium">SKU</TH>
                  <TH className="bg-slate-50 font-medium">Reason</TH>
                  <TH className="bg-slate-50 font-medium">From → to</TH>
                  <TH className="bg-slate-50 font-medium text-right">Qty</TH>
                  <TH className="bg-slate-50 font-medium">Reference</TH>
                </tr>
              </thead>
              <tbody>
                {moves.map((m, i) => (
                  <tr key={`${m.sku}-${i}`}>
                    <TD className="py-2.5">{m.sku}</TD>
                    <TD className="py-2.5">{m.reason}</TD>
                    <TD className="py-2.5">
                      {bucketLabel(m.from)} → {bucketLabel(m.to)}
                    </TD>
                    <TD className="py-2.5 text-right">{n(m.quantity)}</TD>
                    <TD className="py-2.5 text-slate-600">this save</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TableFrame>
      </div>

      <Notice tone="blue" title="No Amazon inbound plan is created here">
        {fbaGains.length > 0
          ? `More units in the FBA pool: ${fbaGains.map((g) => `${g.sku} +${n(g.gain)}`).join(', ')}. Book them into a shipment from FBA shipments when you're ready.`
          : 'FBA units wait in the FBA pool until you book them into a shipment from FBA shipments.'}
      </Notice>
    </div>
  )
}
