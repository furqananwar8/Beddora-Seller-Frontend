import React from 'react'
import { ProductInventoryItem, PushResult } from '@/services/api/inventoryPlanner.api'
import { cn } from '@/utils/cn'
import { AllocationDrawerModel } from './useAllocationDrawer'
import { DrawerButton, Notice, ProductCell, TableFrame, TD, TH } from './drawerUi'

const STATUS: Record<'updated' | 'created' | 'failed', { label: string; className: string }> = {
  updated: { label: 'Updated', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  created: { label: 'Listing created', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  failed: { label: 'Failed', className: 'bg-red-50 text-red-800 border-red-300' },
}

const statusOf = (r: PushResult) =>
  !r.success ? STATUS.failed : r.action === 'PRODUCT_CREATED_AND_INVENTORY_UPDATED' ? STATUS.created : STATUS.updated

export const ResultStep: React.FC<{ items: ProductInventoryItem[]; model: AllocationDrawerModel }> = ({ items, model }) => {
  const { state, targets, retry, isRetrying } = model
  const results = state.result?.pushResults ?? []
  const failed = results.filter((r) => !r.success)
  const titleOf = new Map(items.map((i) => [Number(i.id), i.description]))
  const nameOf = (id: string) => targets.find((t) => t.id === id)?.name ?? id
  // Failures first so they're what the planner sees
  const ordered = [...results].sort((a, b) => Number(a.success) - Number(b.success))
  const donePercent = results.length ? ((results.length - failed.length) / results.length) * 100 : 0

  return (
    <div className="flex flex-col gap-5">
      {results.length === 0 ? (
        <p className="text-sm text-slate-600">No channels were selected, so nothing was pushed.</p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-slate-900">
                {results.length - failed.length} of {results.length} listings updated
              </span>
              {failed.length > 0 && <span className="text-slate-600">{failed.length} failed</span>}
            </div>
            <div className="flex h-2.5 overflow-hidden !rounded-full bg-slate-200">
              <div style={{ width: `${donePercent}%` }} className="bg-emerald-600" />
              <div style={{ width: `${100 - donePercent}%` }} className="bg-red-700" />
            </div>
          </div>

          <TableFrame>
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <TH className="w-[260px]">Product</TH>
                  <TH className="w-[160px]">Listing</TH>
                  <TH className="w-[90px] text-right">Qty</TH>
                  <TH className="w-[150px]">Status</TH>
                  <TH>Detail</TH>
                </tr>
              </thead>
              <tbody>
                {ordered.map((r) => {
                  const status = statusOf(r)
                  return (
                    <tr key={`${r.inventoryItemId}-${r.channel}`}>
                      <TD className="py-2.5">
                        <ProductCell title={titleOf.get(r.inventoryItemId) ?? r.sku} sku={r.sku} />
                      </TD>
                      <TD className="py-2.5">{nameOf(r.channel)}</TD>
                      <TD className="py-2.5 text-right font-medium">{r.quantity.toLocaleString()}</TD>
                      <TD className="py-2.5">
                        <span className={cn('text-xs font-medium px-2.5 py-1 border !rounded-md', status.className)}>{status.label}</span>
                      </TD>
                      <TD className="py-2.5">
                        <div className="flex items-center justify-between gap-3 text-[13px] text-slate-600">
                          <span>{r.error ?? ''}</span>
                          {!r.success && (
                            <DrawerButton className="h-9 text-[13px] shrink-0" onClick={() => retry([r])} disabled={isRetrying}>
                              Retry now
                            </DrawerButton>
                          )}
                        </div>
                      </TD>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </TableFrame>
        </>
      )}

      <Notice tone="neutral" title="The stock split is saved even if a channel fails">
        A failed push only means that channel still shows its old number. Retry it here, or push again later from the planner's ⋮
        menu.
      </Notice>
    </div>
  )
}
