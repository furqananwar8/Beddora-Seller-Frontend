'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { PageHeader } from '@/components/layout'
import { MultiSelectInput } from '@/components/multi-select-input/MultiSelectInput'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { Button } from '@/design-system/buttons'
import { CellInput } from '@/features/breakeven/amazon/PricingCells'
import type { PricingCountry } from '@/services/api/amazonPricing.api'
import { cn } from '@/utils/cn'
import { useDebounce } from '@/utils/debounce'
import { DEFAULT_AD_BUDGET_CAP, DEFAULT_OVERSTOCK_DAYS, DEFAULT_STAGE_TARGETS, DEFAULT_STOCKOUT_DAYS, previousMonth, STAGES, type Stage } from './marketingPlan.calc'
import { PLAN_COLUMNS, PLAN_TABLE_WIDTH, type PlanColumn } from './marketingPlanColumns'
import { useMarketingPlan } from './useMarketingPlan'

/**
 * PPC > Marketing Plan: the "SKU-wise Marketing Plan" sheet as a screen. Each Amazon SKU with last month's results, the
 * TACoS to aim for from its profit and stage, and the ad budget that gives for next month's planned units. Highlighted
 * inputs (stage, planned units, the stage targets, thresholds and budget cap) can be changed to see the effect; nothing
 * is saved, and the plan starts from the defaults on every visit.
 */

const PAGE_SIZE = 50

const COUNTRY_OPTIONS = [
  { id: 'CA', name: 'Canada (CAD)' },
  { id: 'US', name: 'USA (USD)' },
  { id: 'MX', name: 'Mexico (MXN)' },
]
// Amazon only for now; Temu, Walmart and others join here later
const CHANNEL_OPTIONS = [{ id: 'amazon', name: 'Amazon' }]

const monthLabel = (month: string) => new Date(`${month}-01T00:00:00`).toLocaleDateString('en-CA', { month: 'short', year: 'numeric' })

export const MarketingPlanScreen: React.FC = () => {
  const [country, setCountry] = useState<PricingCountry>('CA')
  // each marketplace has its own listings and figures, so the board starts afresh when it changes
  return <MarketingPlanBoard key={country} country={country} onCountryChange={setCountry} />
}

const MarketingPlanBoard: React.FC<{ country: PricingCountry; onCountryChange: (country: PricingCountry) => void }> = ({ country, onCountryChange }) => {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search.trim(), 300)
  const [page, setPage] = useState(1)
  const plan = useMarketingPlan(country, debouncedSearch)
  const { settings, setSettings, budgetCap, setBudgetCap, currency } = plan

  useEffect(() => setPage(1), [debouncedSearch])
  const totalPages = Math.max(1, Math.ceil(plan.lines.length / PAGE_SIZE))
  const pageLines = useMemo(() => plan.lines.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [plan.lines, page])
  const context = useMemo(() => ({ currency, setStage: plan.setStage, setPlannedUnits: plan.setPlannedUnits }), [currency, plan.setStage, plan.setPlannedUnits])

  const overCap = plan.totals.recommendedBudget > budgetCap
  const money = (value: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
  const changed =
    plan.editedCount > 0 ||
    budgetCap !== DEFAULT_AD_BUDGET_CAP ||
    settings.overstockDays !== DEFAULT_OVERSTOCK_DAYS ||
    settings.stockoutDays !== DEFAULT_STOCKOUT_DAYS ||
    STAGES.some((stage) => settings.stageTargets[stage] !== DEFAULT_STAGE_TARGETS[stage])

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader title="PPC · Marketing Plan" description="Ad budget by SKU from last month's results, its profit and its stage. Change a highlighted input to see the effect; nothing is saved." />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search SKU or title..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-border bg-surface-primary py-2 pl-10 pr-3 text-sm text-text-primary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="min-w-[130px] shrink-0">
          <MultiSelectInput single title="Channel" options={CHANNEL_OPTIONS} value={['amazon']} onChange={() => undefined} />
        </div>
        <div className="min-w-[160px] shrink-0">
          <MultiSelectInput single title="Marketplace" options={COUNTRY_OPTIONS} value={[country]} onChange={(value) => value[0] && onCountryChange(value[0] as PricingCountry)} />
        </div>
        {changed && (
          <Button type="button" size="sm" variant="outline" onClick={plan.reset}>
            Reset to defaults
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Plan">
          <Row label="Plan month (1st date)">
            <input
              type="month"
              aria-label="Plan month"
              value={plan.planMonth}
              onChange={(event) => event.target.value && plan.setPlanMonth(event.target.value)}
              className="rounded border border-border bg-surface px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </Row>
          <Row label="Last month (data month)">{monthLabel(previousMonth(plan.planMonth))}</Row>
          <Row label={`Account ad budget cap (${currency})`}>
            <div className="w-32">
              <CellInput ariaLabel="Account ad budget cap" value={budgetCap} edited={budgetCap !== DEFAULT_AD_BUDGET_CAP} onChange={(value) => setBudgetCap(value ?? DEFAULT_AD_BUDGET_CAP)} prefix="$" />
            </div>
          </Row>
          <Row label="Total recommended ad budget">{money(plan.totals.recommendedBudget)}</Row>
          <Row label="Last month total ad spend">{money(plan.totals.lastMonthSpend)}</Row>
          <Row label="Budget vs cap">
            <span className={cn('font-medium', overCap ? 'text-danger-600' : 'text-success-600')}>{overCap ? 'Over cap - scale SKUs down' : 'Within cap'}</span>
          </Row>
        </Panel>

        <Panel title="Target net profit % (of price) by stage">
          {STAGES.map((stage) => (
            <Row key={stage} label={stage}>
              <div className="w-28">
                <CellInput
                  ariaLabel={`Target net profit for ${stage}`}
                  value={Math.round(settings.stageTargets[stage] * 10_000) / 100}
                  edited={settings.stageTargets[stage] !== DEFAULT_STAGE_TARGETS[stage]}
                  allowNegative
                  suffix="%"
                  onChange={(value) => setSettings((current) => ({ ...current, stageTargets: { ...current.stageTargets, [stage as Stage]: (value ?? DEFAULT_STAGE_TARGETS[stage] * 100) / 100 } }))}
                />
              </div>
            </Row>
          ))}
        </Panel>

        <Panel title="Stock thresholds (days of cover)">
          <Row label="Overstock threshold">
            <div className="w-28">
              <CellInput ariaLabel="Overstock threshold" value={settings.overstockDays} edited={settings.overstockDays !== DEFAULT_OVERSTOCK_DAYS} onChange={(value) => setSettings((current) => ({ ...current, overstockDays: value ?? DEFAULT_OVERSTOCK_DAYS }))} />
            </div>
          </Row>
          <Row label="Stock-out threshold">
            <div className="w-28">
              <CellInput ariaLabel="Stock-out threshold" value={settings.stockoutDays} edited={settings.stockoutDays !== DEFAULT_STOCKOUT_DAYS} onChange={(value) => setSettings((current) => ({ ...current, stockoutDays: value ?? DEFAULT_STOCKOUT_DAYS }))} />
            </div>
          </Row>
          <p className="mt-2 text-xs text-text-muted">Profit per unit comes from Breakeven Analysis · Amazon, edits there included.</p>
        </Panel>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <div className={cn('max-h-[calc(100vh-330px)] min-h-[320px] overflow-auto rounded-t-xl', plan.isFetching && !plan.isLoading && 'opacity-70 transition-opacity')}>
          <table className="border-separate border-spacing-0 text-sm" style={{ tableLayout: 'fixed', width: PLAN_TABLE_WIDTH }}>
            <colgroup>
              {PLAN_COLUMNS.map((column) => (
                <col key={column.id} style={{ width: column.width }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {PLAN_COLUMNS.map((column) => (
                  <th key={column.id} scope="col" style={headStyle(column)} className={cn(HEAD, column.editable && 'text-warning-700', column.frozen && EDGE)}>
                    <span className="block leading-tight">{column.header}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plan.isLoading ? (
                <StatusRow>Loading the plan…</StatusRow>
              ) : plan.error ? (
                <StatusRow tone="danger">Could not load the plan. Please try again.</StatusRow>
              ) : pageLines.length === 0 ? (
                <StatusRow>{debouncedSearch ? 'No SKUs match your search.' : 'No listings for this marketplace.'}</StatusRow>
              ) : (
                pageLines.map((line) => (
                  <tr key={line.sku} className="group">
                    {PLAN_COLUMNS.map((column) => (
                      <td key={column.id} style={bodyStyle(column)} className={cn(CELL, column.frozen ? 'bg-surface' : 'group-hover:bg-secondary-50', column.frozen && EDGE)}>
                        {column.cell(line, context)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {plan.lines.length > 0 && <PaginationFooter page={page} pageSize={PAGE_SIZE} totalItems={plan.lines.length} totalPages={totalPages} onPageChange={setPage} itemLabel="SKUs" />}
      </div>
    </div>
  )
}

const HEAD = 'relative !whitespace-normal break-words !overflow-visible border-b border-border bg-surface px-3 py-2.5 text-center align-middle text-xs font-semibold uppercase tracking-wide text-text-muted'
const CELL = 'break-words border-b border-border/60 px-3 py-2 text-center align-middle'
const EDGE = 'border-r border-border shadow-[2px_0_4px_rgba(0,0,0,0.05)]'

const headStyle = (column: PlanColumn): React.CSSProperties => ({ position: 'sticky', top: 0, left: column.frozen ? 0 : undefined, zIndex: column.frozen ? 40 : 20 })
const bodyStyle = (column: PlanColumn): React.CSSProperties | undefined => (column.frozen ? { position: 'sticky', left: 0, zIndex: 10 } : undefined)

const StatusRow: React.FC<{ children: React.ReactNode; tone?: 'danger' }> = ({ children, tone }) => (
  <tr>
    <td colSpan={99} className="p-0">
      <div className={cn('sticky left-0 flex min-h-[16rem] w-full max-w-[100vw] items-center justify-center px-4 text-sm', tone === 'danger' ? 'text-danger-600' : 'text-text-muted')}>{children}</div>
    </td>
  </tr>
)

const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="rounded-xl border border-border bg-surface p-4">
    <h2 className="mb-2 text-sm font-semibold text-text-primary">{title}</h2>
    <div className="flex flex-col gap-1.5">{children}</div>
  </section>
)

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between gap-3 text-sm">
    <span className="text-text-secondary">{label}</span>
    <span className="font-medium tabular-nums text-text-primary">{children}</span>
  </div>
)
