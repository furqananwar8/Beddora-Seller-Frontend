'use client'

import React from 'react'
import { FormField, fieldClass, selectClass } from '@/components/form-field/FormField'
import { NumericInput } from '@/components/form-field/NumericInput'
import { SelectShell } from '@/features/finance/shared/SelectShell'
import type { ProductManager } from '@/services/api/productManagers.api'
import { cn } from '@/utils/cn'
import { formatPkr, formatUsd } from './format'
import type { CompanyMonth, IncentiveResult, RewardPicks } from './plan/incentiveCalculator'
import { INCENTIVE_PLAN, RAMADAN_ALLOWANCE_PKR, REWARDS, type RewardKey } from './plan/incentivePlan'

const Panel: React.FC<{ title: string; note?: string; children: React.ReactNode }> = ({ title, note, children }) => (
  <section className="grid min-w-0 gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
    <div>
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      {note && <p className="text-xs text-text-muted">{note}</p>}
    </div>
    {children}
  </section>
)

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="grid gap-0.5">
    <span className="text-xs text-text-muted">{label}</span>
    <span className="font-mono text-base font-semibold tabular-nums text-text-primary">{value}</span>
  </div>
)

const Toggle: React.FC<{ id: string; checked: boolean; onChange: (checked: boolean) => void; children: React.ReactNode }> = ({ id, checked, onChange, children }) => (
  <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm font-medium text-text-primary">
    <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-primary-600" />
    {children}
  </label>
)

interface CompanyPanelProps {
  company: CompanyMonth
  onChange: (company: CompanyMonth) => void
  result: IncentiveResult
}

/** Company inputs that drive the team bonus and the payout cap. */
export const CompanyPanel: React.FC<CompanyPanelProps> = ({ company, onChange, result }) => {
  const setNumber = (key: 'pkrPerUsd' | 'marginPct') => (event: React.ChangeEvent<HTMLInputElement>) => onChange({ ...company, [key]: Number(event.target.value) || 0 })
  const gate = INCENTIVE_PLAN.teamMarginGatePct
  return (
    <Panel title="Company this month">
      <div className="grid grid-cols-2 items-end gap-3">
        <Stat label="Total Amazon sales (all managers)" value={formatUsd(result.totalSalesUsd)} />
        <Stat label="Team pool / each manager" value={result.gatePassed ? `${formatPkr(result.teamPool)} / ${formatPkr(result.teamBonusEach)}` : `PKR 0 (margin below ${gate}%)`} />
        <FormField label="PKR per 1 USD" htmlFor="pm-fx">
          <NumericInput id="pm-fx" decimal value={company.pkrPerUsd || ''} onChange={setNumber('pkrPerUsd')} className={cn(fieldClass(), 'font-mono')} />
        </FormField>
        <FormField label="Contribution margin (%)" htmlFor="pm-margin">
          <NumericInput id="pm-margin" decimal value={company.marginPct || ''} onChange={setNumber('marginPct')} className={cn(fieldClass(), 'font-mono')} />
        </FormField>
      </div>
      <Toggle id="pm-gate" checked={company.gateOnMargin} onChange={(gateOnMargin) => onChange({ ...company, gateOnMargin })}>
        Pay the team bonus only if company margin is {gate}% or more
      </Toggle>
    </Panel>
  )
}

interface RewardsPanelProps {
  managers: ProductManager[]
  picks: RewardPicks
  onChange: (picks: RewardPicks) => void
}

/** The month's award winners; each amount is added to that manager's total. */
export const RewardsPanel: React.FC<RewardsPanelProps> = ({ managers, picks, onChange }) => {
  const setWinner = (key: RewardKey) => (event: React.ChangeEvent<HTMLSelectElement>) => onChange({ ...picks, winners: { ...picks.winners, [key]: event.target.value } })
  return (
    <Panel title="Additional rewards" note="Choose the winners for this month.">
      <div className="grid gap-3">
        {REWARDS.map(({ key, label, amount }) => (
          <FormField key={key} label={`${label} (${formatPkr(amount)})`} htmlFor={`pm-rw-${key}`}>
            <SelectShell>
              <select id={`pm-rw-${key}`} value={picks.winners[key] ?? ''} onChange={setWinner(key)} className={selectClass()}>
                <option value="">No one this month</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name}
                  </option>
                ))}
              </select>
            </SelectShell>
          </FormField>
        ))}
      </div>
      <Toggle id="pm-ramadan" checked={picks.ramadan} onChange={(ramadan) => onChange({ ...picks, ramadan })}>
        Ramadan allowance this month ({formatPkr(RAMADAN_ALLOWANCE_PKR)} each)
      </Toggle>
    </Panel>
  )
}

/** Payout of every manager together, checked against the plan's cap. */
export const TotalsPanel: React.FC<{ result: IncentiveResult; pkrPerUsd: number }> = ({ result, pkrPerUsd }) => {
  const { totals, capPkr } = result
  const capPct = INCENTIVE_PLAN.payoutCapPctOfContribution
  const within = totals.payout <= capPkr
  return (
    <Panel title="Total this month">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Sales incentives" value={formatPkr(totals.salesIncentive)} />
        <Stat label="Performance bonuses" value={formatPkr(totals.bonuses)} />
        <Stat label="Team bonus" value={formatPkr(totals.teamBonus)} />
        <Stat label="Additional rewards" value={formatPkr(totals.rewards)} />
        <Stat label="Total payout (PKR)" value={formatPkr(totals.payout)} />
        <Stat label="Total payout (approx. USD)" value={pkrPerUsd ? formatUsd(totals.payout / pkrPerUsd) : '–'} />
      </div>
      {pkrPerUsd ? (
        <p className={cn('rounded-lg px-3 py-2 text-sm', within ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700')}>
          {within
            ? `Within the cap. Total payout is ${capPkr ? Math.round((totals.payout / capPkr) * 100) : 0}% of the ${formatPkr(capPkr)} allowed (${capPct}% of contribution profit).`
            : `Over the cap. Total payout is more than ${capPct}% of contribution profit (${formatPkr(capPkr)}). Review before paying.`}
        </p>
      ) : (
        <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-700">Enter the PKR per USD rate to check the {capPct}% cap.</p>
      )}
    </Panel>
  )
}
