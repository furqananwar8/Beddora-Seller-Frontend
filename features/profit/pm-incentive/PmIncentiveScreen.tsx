'use client'

import React, { useMemo, useRef, useState } from 'react'
import { Container } from '@/components/layout'
import { currentMonth, MonthPicker, monthLabel, type MonthValue } from '@/components/month-picker/MonthPicker'
import { Button } from '@/design-system/buttons'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useDismiss } from '@/hooks/useDismiss'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useGetProductManagersQuery, type ProductManager } from '@/services/api/productManagers.api'
import { CompanyPanel, RewardsPanel, TotalsPanel } from './IncentiveSettingsPanels'
import { ManagerIncentiveCard, type ManualMetrics } from './ManagerIncentiveCard'
import { ProductManagerDialog } from './managers/ProductManagerDialog'
import { calculateIncentives, type CompanyMonth, type ManagerMonth, type RewardPicks } from './plan/incentiveCalculator'
import { EMPTY_SALES, useManagerSales } from './useManagerProducts'

/** What is typed in for one month, kept in this browser so a refresh does not lose it. */
interface MonthInputs {
  company: CompanyMonth
  picks: RewardPicks
  metrics: Record<string, ManualMetrics>
}

const DEFAULT_INPUTS: MonthInputs = {
  company: { pkrPerUsd: 280, marginPct: 13, gateOnMargin: true },
  picks: { winners: {}, ramadan: false },
  metrics: {},
}

const NO_METRICS: ManualMetrics = { conversionPct: 0, categoryRank: 0 }

const MonthSelect: React.FC<{ value: MonthValue; onChange: (month: MonthValue) => void }> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(ref, () => setOpen(false))
  return (
    <div ref={ref} className="relative">
      <Button type="button" size="sm" variant="outline" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {monthLabel(value)}
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-64 shadow-lg">
          <MonthPicker
            value={value}
            max={currentMonth()}
            onChange={(month) => {
              onChange(month)
              setOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}

/** Profit > PM Incentive: one product manager's incentive for the month, worked out from the SKUs they manage. */
export const PmIncentiveScreen: React.FC = () => {
  const [month, setMonth] = useState<MonthValue>(currentMonth)
  const [inputsByMonth, setInputsByMonth] = useLocalStorage<Record<MonthValue, MonthInputs>>('pm-incentive-inputs', {})
  const inputs = inputsByMonth[month] ?? DEFAULT_INPUTS
  const [selectedId, setSelectedId] = useState('')
  const [dialog, setDialog] = useState<{ manager: ProductManager | null } | null>(null)
  const canWrite = useAppAbility().can('write', 'profit:pm-incentive')

  const { data: managers = [], isLoading, isError } = useGetProductManagersQuery()
  const { salesByManager, isFetching } = useManagerSales(month, managers)
  const activeId = managers.some((m) => m.id === selectedId) ? selectedId : (managers[0]?.id ?? '')

  const result = useMemo(() => {
    const months = managers.map((manager): ManagerMonth => {
      const sales = salesByManager.get(manager.id) ?? EMPTY_SALES
      return { id: manager.id, name: manager.name, salesUsd: sales.salesUsd, acosPct: sales.acosPct, ...(inputs.metrics[manager.id] ?? NO_METRICS) }
    })
    return calculateIncentives(months, inputs.company, inputs.picks)
  }, [managers, salesByManager, inputs])

  const update = (patch: Partial<MonthInputs>) => setInputsByMonth((all) => ({ ...all, [month]: { ...(all[month] ?? DEFAULT_INPUTS), ...patch } }))

  return (
    <Container size="full" className="py-4 sm:py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">PM Incentive</h1>
          <p className="text-sm text-text-muted">Each product manager&apos;s monthly incentive in PKR, from the sales and ACoS of the Amazon SKUs they manage</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <MonthSelect value={month} onChange={setMonth} />
          {canWrite && (
            <Button type="button" size="sm" onClick={() => setDialog({ manager: null })}>
              + Add manager
            </Button>
          )}
        </div>
      </div>

      {isError ? (
        <div className="rounded-xl border border-danger-200 bg-danger-50 p-8 text-center text-sm text-danger-700">Could not load the product managers. Refresh to try again.</div>
      ) : !isLoading && managers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">
          No product managers yet. {canWrite ? 'Add one and pick the products they manage to see their incentive.' : 'Ask an admin to add them.'}
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <ManagerIncentiveCard
            managers={managers}
            selectedId={activeId}
            onSelect={setSelectedId}
            onEdit={canWrite ? (manager) => setDialog({ manager }) : undefined}
            sales={salesByManager.get(activeId) ?? EMPTY_SALES}
            metrics={inputs.metrics[activeId] ?? NO_METRICS}
            onMetricsChange={(metrics) => update({ metrics: { ...inputs.metrics, [activeId]: metrics } })}
            payout={result.payouts.find((p) => p.manager.id === activeId)}
            loading={isLoading || isFetching}
          />
          <div className="grid gap-4">
            <CompanyPanel company={inputs.company} onChange={(company) => update({ company })} result={result} />
            <RewardsPanel managers={managers} picks={inputs.picks} onChange={(picks) => update({ picks })} />
            <TotalsPanel result={result} pkrPerUsd={inputs.company.pkrPerUsd} />
          </div>
        </div>
      )}

      <ProductManagerDialog isOpen={dialog !== null} manager={dialog?.manager} onClose={() => setDialog(null)} onSaved={(saved) => setSelectedId(saved.id)} />
    </Container>
  )
}
