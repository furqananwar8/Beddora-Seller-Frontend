import React from 'react'
import { ChannelTarget, ProductInventoryItem } from '@/services/api/inventoryPlanner.api'
import { Spinner } from '@/design-system/loaders'
import { cn } from '@/utils/cn'
import { AllocationDrawerModel } from './useAllocationDrawer'
import { ProductCell, Switch, TableFrame } from './drawerUi'

const REGION_LABEL: Record<ChannelTarget['region'], string> = { US: 'United States', CA: 'Canada', MX: 'Mexico' }

export const ChannelsStep: React.FC<{ items: ProductInventoryItem[]; model: AllocationDrawerModel }> = ({ items, model }) => {
  const { targets, targetsLoading, channelsFor, toggleChannel, setColumn, state } = model

  if (targetsLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16">
        <Spinner />
        <span className="text-sm text-slate-600">Loading channels...</span>
      </div>
    )
  }

  const regions = [...new Set(targets.map((t) => t.region))]
  const firstOfRegion = new Set(regions.map((r) => targets.find((t) => t.region === r)!.id))
  const edge = (t: ChannelTarget) => (firstOfRegion.has(t.id) ? 'border-l border-slate-200' : '')
  const pickedCount = (targetId: string) => items.filter((item) => channelsFor(item.id).includes(targetId)).length

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4 px-4 py-3 border border-slate-200 bg-slate-50 !rounded-[10px]">
        <span className="text-sm text-slate-700">Push quantity is each SKU's FBM. Buffer and FBA are never pushed.</span>
        <span className="text-[13px] text-slate-600 shrink-0">A column switch selects every SKU for that channel</span>
      </div>

      <TableFrame>
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-100 text-xs font-semibold text-slate-700">
              <th className="px-4 py-2.5 border-b border-slate-200" colSpan={2} />
              {regions.map((region) => (
                <th
                  key={region}
                  colSpan={targets.filter((t) => t.region === region).length}
                  className="px-2 py-2.5 text-center border-b border-l border-slate-200"
                >
                  {REGION_LABEL[region]}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-50 text-xs text-slate-600">
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 border-b border-slate-200 min-w-[230px]">Product</th>
              <th className="px-2 py-2.5 text-right font-semibold text-slate-700 border-b border-slate-200 w-24">Push qty</th>
              {targets.map((target) => {
                const count = pickedCount(target.id)
                return (
                  <th key={target.id} className={cn('px-1 py-2.5 border-b border-slate-200 font-normal', edge(target))}>
                    <div className="flex flex-col items-center gap-2" title={target.connected ? undefined : `${target.name} is not connected`}>
                      <span>{target.channel}</span>
                      <Switch
                        on={target.connected && count === items.length}
                        disabled={!target.connected}
                        label={`Select every SKU for ${target.name}`}
                        onChange={(on) => setColumn(target.id, on)}
                      />
                      <span className="text-[11px]">{target.connected ? `${count}/${items.length}` : 'Not connected'}</span>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const picks = channelsFor(item.id)
              const split = state.splits[item.id]
              return (
                <tr key={item.id} className="h-[76px]">
                  <td className="px-4 py-3 border-b border-slate-200">
                    <ProductCell title={item.description} sku={item.sku} />
                  </td>
                  <td className="px-2 py-3 border-b border-slate-200 text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-lg font-semibold text-emerald-800">{split.fbm.toLocaleString()}</span>
                      <span className="text-xs text-slate-600">
                        {split.buffer > 0 ? `buffer ${split.buffer.toLocaleString()} kept` : 'FBM units'}
                      </span>
                    </div>
                  </td>
                  {targets.map((target) => (
                    <td key={target.id} className={cn('px-1 py-3 border-b border-slate-200 text-center', edge(target))}>
                      <input
                        type="checkbox"
                        className="w-[22px] h-[22px] accent-primary-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                        checked={target.connected && picks.includes(target.id)}
                        disabled={!target.connected}
                        title={target.connected ? undefined : `${target.name} is not connected`}
                        aria-label={`Push ${item.sku} to ${target.name}`}
                        onChange={() => toggleChannel(item.id, target.id)}
                      />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </TableFrame>
    </div>
  )
}
