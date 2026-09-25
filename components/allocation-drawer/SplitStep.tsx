import React from 'react'
import { ProductInventoryItem } from '@/services/api/inventoryPlanner.api'
import { cn } from '@/utils/cn'
import { AllocationDrawerModel } from './useAllocationDrawer'
import { STOCK_LEGEND, StockBar } from './StockBar'
import { Chip, Tile } from './drawerUi'
import { onHand, parseUnits, splitFromBalances, unassigned } from './allocationMath'

const n = (value: number) => value.toLocaleString()

const NumberField = ({
  id,
  label,
  value,
  hint,
  invalid,
  tone = 'default',
  onChange,
}: {
  id: string
  label: string
  value: number
  hint?: string
  invalid?: boolean
  tone?: 'default' | 'amber'
  onChange: (units: number) => void
}) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className={cn('text-[13px] font-medium', tone === 'amber' ? 'text-amber-900' : 'text-slate-700')}>
      {label}
    </label>
    <input
      id={id}
      type="number"
      min={0}
      step={1}
      value={value}
      onChange={(e) => onChange(parseUnits(e.target.value))}
      className={cn(
        'h-10 w-full px-3 !rounded-lg border bg-white text-[15px] font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-200',
        invalid ? 'border-red-700' : tone === 'amber' ? 'border-amber-600' : 'border-slate-300'
      )}
    />
    {hint && <span className="text-xs text-slate-600">{hint}</span>}
  </div>
)

const joinHint = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(' · ') || undefined

const SplitCard = ({ item, model }: { item: ProductInventoryItem; model: AllocationDrawerModel }) => {
  const { balances } = item
  const split = model.state.splits[item.id]
  const base = splitFromBalances(balances)
  const left = unassigned(balances, split)
  const error = model.errors[item.id]
  const newUnits = balances.UNALLOCATED
  const newFba = Math.max(0, split.fba - base.fba)
  const newFbm = Math.max(0, split.fbm - base.fbm)
  const set = (field: 'fba' | 'buffer' | 'fbm') => (units: number) => model.setSplitField(item.id, field, units)
  const fieldId = (name: string) => `alloc-${item.id}-${name}`

  return (
    <section className={cn('border !rounded-xl px-5 py-[18px] flex flex-col gap-3.5', error ? 'border-red-300' : 'border-slate-200')}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-base font-semibold text-slate-900 truncate">{item.description}</span>
          <span className="font-mono text-[13px] text-slate-600">{item.sku}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {newUnits === 0 && left === 0 && (
            <span className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 !rounded-md">
              Fully assigned
            </span>
          )}
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[13px] text-slate-600">On hand</span>
            <span className="text-xl font-semibold text-slate-900">
              {n(onHand(balances))}
              {newUnits > 0 && onHand(balances) > newUnits && (
                <span className="text-sm font-medium text-slate-600">
                  {' '}
                  {n(onHand(balances) - newUnits)} + {n(newUnits)} new
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {newUnits > 0 && (
        <div className="flex flex-col gap-3 px-4 py-3.5 bg-amber-50 border border-amber-300 !rounded-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-amber-900">
              Assign {n(newUnits)} new unit{newUnits === 1 ? '' : 's'}
              {item.lastReceivedDate && ` from the ${item.lastReceivedDate} entry`}
            </span>
            <div className="flex gap-2">
              <Chip onClick={() => model.assign(item.id, 'fba')} disabled={left <= 0}>All to FBA</Chip>
              <Chip onClick={() => model.assign(item.id, 'fbm')} disabled={left <= 0}>All to FBM</Chip>
              <Chip onClick={() => model.assign(item.id, 'even')} disabled={left <= 0}>Split evenly</Chip>
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div className="w-40">
              <NumberField id={fieldId('new-fba')} label="To FBA" tone="amber" value={newFba} onChange={(u) => set('fba')(base.fba + u)} />
            </div>
            <span className="pb-2 text-xl text-amber-800">+</span>
            <div className="w-40">
              <NumberField id={fieldId('new-fbm')} label="To FBM" tone="amber" value={newFbm} onChange={(u) => set('fbm')(base.fbm + u)} />
            </div>
            <span className="pb-2 text-xl text-amber-800">=</span>
            <div className="flex flex-col gap-1 pb-0.5">
              <span className="text-[13px] text-amber-900">Assigned</span>
              <span className="text-lg font-semibold text-amber-900">
                {n(Math.min(newUnits, newUnits - left))} of {n(newUnits)} · {n(Math.max(0, left))} left
              </span>
            </div>
          </div>
        </div>
      )}

      <StockBar balances={balances} split={split} />

      <div className="grid grid-cols-3 gap-4">
        <NumberField
          id={fieldId('fba')}
          label="FBA total"
          value={split.fba}
          onChange={set('fba')}
          invalid={split.fba < balances.FBA_RESERVED || Boolean(error && left < 0)}
          hint={joinHint(
            newFba > 0 && `${n(base.fba)} + ${n(newFba)} new`,
            balances.FBA_RESERVED > 0 && `min ${n(balances.FBA_RESERVED)}, held by FBA shipments`
          )}
        />
        <NumberField id={fieldId('buffer')} label="Safety buffer" value={split.buffer} onChange={set('buffer')} hint="Never pushed to channels" />
        <NumberField
          id={fieldId('fbm')}
          label="FBM"
          value={split.fbm}
          onChange={set('fbm')}
          invalid={Boolean(error && left < 0)}
          hint={joinHint(newFbm > 0 && `${n(base.fbm)} + ${n(newFbm)} new`) ?? 'Pushed to the channels you pick next'}
        />
      </div>

      {error && <p className="text-[13px] text-red-700">{error}</p>}
    </section>
  )
}

export const SplitStep: React.FC<{ items: ProductInventoryItem[]; model: AllocationDrawerModel }> = ({ items, model }) => {
  const splits = items.map((i) => model.state.splits[i.id])
  const totals = {
    onHand: items.reduce((s, i) => s + onHand(i.balances), 0),
    newUnits: items.reduce((s, i) => s + i.balances.UNALLOCATED, 0),
    left: items.reduce((s, i) => s + Math.max(0, unassigned(i.balances, model.state.splits[i.id])), 0),
    fba: splits.reduce((s, sp) => s + sp.fba, 0),
    reserved: items.reduce((s, i) => s + i.balances.FBA_RESERVED, 0),
    fbm: splits.reduce((s, sp) => s + sp.fbm, 0),
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-4 gap-3">
        <Tile label="On hand" value={n(totals.onHand)} />
        <Tile label={`Unassigned · ${n(totals.newUnits)} new`} value={totals.left > 0 ? n(totals.left) : '0 left'} tone="amber" />
        <Tile label={`FBA · ${n(totals.reserved)} in shipments`} value={n(totals.fba)} tone="blue" />
        <Tile label="FBM" value={n(totals.fbm)} tone="green" />
      </div>

      <div className="flex flex-wrap gap-[18px] text-[13px] text-slate-600">
        {STOCK_LEGEND.map((entry) => (
          <span key={entry.key} className="flex items-center gap-1.5">
            <span className={cn('inline-block w-3 h-3 !rounded-[3px]', entry.swatch)} />
            {entry.label}
          </span>
        ))}
      </div>

      {items.map((item) => (
        <SplitCard key={item.id} item={item} model={model} />
      ))}
    </div>
  )
}
