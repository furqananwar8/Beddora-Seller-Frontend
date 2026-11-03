'use client'

import React from 'react'
import { formatCurrency } from '@/utils/format'
import { CellInput, Figure } from './PricingCells'
import { SkuDetails } from './SkuDetails'
import type { SessionMode } from './amazonPricing.calc'
import type { EditableField, PricingGlobals, PricingLine } from './useAmazonPricing'

/**
 * The Amazon tab's columns, in the order of the "Price & Profit Analysis" sheet (A to AU), with Current Selling Price
 * added before the Beddora selling price. SKU and ASIN stay in view while the rest scrolls behind them; the title, parent and the other descriptive columns open in a modal when the SKU is clicked.
 */

export interface ColumnContext {
  currency: string
  globals: PricingGlobals
  setEdit: (key: string, field: EditableField, value: number | undefined) => void
  setMode: (key: string, mode: SessionMode | undefined) => void
}

const SESSION_MODES: SessionMode[] = ['Off-Peak', 'On-Peak', 'Weighted Average']

export interface PricingColumn {
  id: string
  /** The sheet's column letter, shown small under the header; none for the added column. */
  letter?: string
  header: string
  width: number
  align?: 'left' | 'center' | 'right'
  /** SKU and ASIN: they stay put while the others scroll sideways. */
  frozen?: boolean
  cell: (line: PricingLine, context: ColumnContext) => React.ReactNode
}

const DASH = <span className="text-text-subtle">—</span>
const money = (value: number | null, currency: string) => (value === null ? DASH : <Figure>{formatCurrency(value, currency)}</Figure>)
const percent = (value: number | null, digits = 1) => (value === null ? DASH : <Figure>{(value * 100).toFixed(digits)}%</Figure>)
const text = (value: string | number | null | undefined) => (value === null || value === undefined || value === '' ? DASH : <span>{value}</span>)

/** An editable cell bound to one field of a row. */
function input(field: EditableField, label: string, options: { prefix?: (currency: string) => string; suffix?: string; disabled?: (line: PricingLine) => boolean; title?: (line: PricingLine) => string | undefined } = {}) {
  return (line: PricingLine, { currency, setEdit }: ColumnContext) => (
    <CellInput
      ariaLabel={`${label} of ${line.row.sku}`}
      value={line.values[field]}
      edited={line.edited.has(field)}
      onChange={(value) => setEdit(line.key, field, value)}
      prefix={options.prefix?.(currency)}
      suffix={options.suffix}
      disabled={options.disabled?.(line)}
      title={options.title?.(line)}
    />
  )
}

const symbol = () => '$'

/** Profit is green above zero and red below it. */
const profitTone = (value: number | null) => (value === null ? undefined : value >= 0 ? 'good' : 'bad')

export const FROZEN_WIDTHS = [190, 130] as const

export const PRICING_COLUMNS: PricingColumn[] = [
  { id: 'sku', letter: 'A', header: 'Beddora Seller SKU', width: FROZEN_WIDTHS[0], align: 'left', frozen: true, cell: (line) => <SkuDetails line={line} /> },
  { id: 'asin', letter: 'C', header: 'ASIN', width: FROZEN_WIDTHS[1], align: 'left', frozen: true, cell: ({ row }) => text(row.asin) },

  {
    id: 'session',
    letter: 'S',
    header: 'Season / Mode',
    width: 150,
    align: 'center',
    // starts at the applied filter's mode; a row's own pick is tinted, and picking the filter's mode again clears it
    cell: (line, { setMode }) => (
      <select
        aria-label={`Season / Mode of ${line.row.sku}`}
        value={line.sessionMode}
        onChange={(event) => setMode(line.key, event.target.value as SessionMode)}
        className={`w-full rounded border px-1.5 py-1 text-xs outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 ${line.sessionModeEdited ? 'border-warning-300 bg-warning-50' : 'border-border bg-surface'}`}
      >
        {SESSION_MODES.map((mode) => (
          <option key={mode} value={mode}>
            {mode}
          </option>
        ))}
      </select>
    ),
  },
  { id: 'storageMonthly', letter: 'T', header: 'Monthly Storage Fee', width: 120, align: 'right', cell: ({ result }, { currency }) => money(result.monthlyStorageFee, currency) },
  { id: 'days', letter: 'U', header: 'Days in Stock', width: 100, align: 'right', cell: input('daysInStock', 'Days in stock') },
  { id: 'currentPrice', header: 'Current Selling Price', width: 120, align: 'right', cell: ({ row }, { currency }) => money(row.currentPrice, currency) },
  { id: 'sellingPrice', letter: 'W', header: 'Beddora Selling Price', width: 130, align: 'right', cell: input('sellingPrice', 'Selling price', { prefix: symbol }) },
  { id: 'landed', letter: 'X', header: 'Current Landed Cost', width: 130, align: 'right', cell: input('landedCost', 'Landed cost', { prefix: symbol }) },
  { id: 'overhead', letter: 'Y', header: 'Operational Overhead %', width: 120, align: 'right', cell: input('overheadPct', 'Overhead', { suffix: '%' }) },
  { id: 'commissionPct', letter: 'Z', header: 'Amazon Commission %', width: 120, align: 'right', cell: input('commissionPct', 'Commission', { suffix: '%' }) },
  { id: 'commission', letter: 'AA', header: 'Amazon Commission', width: 120, align: 'right', cell: ({ result }, { currency }) => money(result.commission, currency) },
  { id: 'fbaFee', letter: 'AB', header: 'Amazon FBA Fees', width: 120, align: 'right', cell: input('fbaFee', 'FBA fee', { prefix: symbol }) },
  { id: 'storageUnit', letter: 'AC', header: 'Storage Cost per Unit Sold', width: 130, align: 'right', cell: ({ result }, { currency }) => money(result.storagePerUnitSold, currency) },
  { id: 'marketingPct', letter: 'AD', header: 'Marketing Cost %', width: 110, align: 'right', cell: input('marketingPct', 'Marketing', { suffix: '%' }) },
  { id: 'marketing', letter: 'AE', header: 'Marketing Cost', width: 110, align: 'right', cell: ({ result }, { currency }) => money(result.marketingCost, currency) },
  { id: 'totalFee', letter: 'AF', header: 'Total Amazon Fee', width: 120, align: 'right', cell: ({ result }, { currency }) => money(result.totalAmazonFee, currency) },
  { id: 'totalCost', letter: 'AG', header: 'Total Cost', width: 110, align: 'right', cell: ({ result }, { currency }) => money(result.totalCost, currency) },
  {
    id: 'netProfit',
    letter: 'AH',
    header: 'Net Profit',
    width: 110,
    align: 'right',
    cell: ({ result }, { currency }) => (result.netProfit === null ? DASH : <Figure tone={profitTone(result.netProfit)} bold>{formatCurrency(result.netProfit, currency)}</Figure>),
  },
  { id: 'netMargin', letter: 'AI', header: 'Net Margin %', width: 100, align: 'right', cell: ({ result }) => (result.netMargin === null ? DASH : <Figure tone={profitTone(result.netMargin)}>{(result.netMargin * 100).toFixed(1)}%</Figure>) },
  { id: 'breakEven', letter: 'AJ', header: 'Break-even Price', width: 120, align: 'right', cell: ({ result }, { currency }) => money(result.breakEvenPrice, currency) },
  { id: 'promo', letter: 'AK', header: 'Promo Discount %', width: 110, align: 'right', cell: input('promoPct', 'Promo discount', { suffix: '%' }) },
  { id: 'promoImpact', letter: 'AL', header: 'Net Promo Impact', width: 120, align: 'right', cell: ({ result }, { currency }) => money(result.promoImpact, currency) },
  { id: 'returnRate', letter: 'AM', header: 'Est. Return Rate %', width: 110, align: 'right', cell: input('returnPct', 'Return rate', { suffix: '%' }) },
  { id: 'returnCost', letter: 'AN', header: 'Est. Return Cost', width: 110, align: 'right', cell: ({ result }, { currency }) => money(result.returnCost, currency) },
  {
    id: 'shipping',
    letter: 'AO',
    header: 'Est. Shipping Cost (FBM only)',
    width: 130,
    align: 'right',
    cell: input('shippingCost', 'Shipping cost', { prefix: symbol, disabled: ({ row }) => row.fulfillment === 'FBA', title: ({ row }) => (row.fulfillment === 'FBA' ? 'Only FBM listings ship themselves' : undefined) }),
  },
  { id: 'realizedProfit', letter: 'AP', header: 'Realized Net Profit', width: 120, align: 'right', cell: ({ result }, { currency }) => (result.realizedNetProfit === null ? DASH : <Figure tone={profitTone(result.realizedNetProfit)} bold>{formatCurrency(result.realizedNetProfit, currency)}</Figure>) },
  { id: 'realizedMargin', letter: 'AQ', header: 'Realized Net Margin %', width: 120, align: 'right', cell: ({ result }) => percent(result.realizedNetMargin, 2) },
  { id: 'adjustedBreakEven', letter: 'AR', header: 'Adjusted Break-even Price', width: 130, align: 'right', cell: ({ result }, { currency }) => money(result.adjustedBreakEvenPrice, currency) },
  {
    id: 'netTakeHome',
    letter: 'AS',
    header: 'Net Take Home',
    width: 120,
    align: 'right',
    cell: input('netTakeHome', 'Net take home', { prefix: symbol, title: () => 'Set a profit per unit to price for it; this replaces the target margin' }),
  },
  {
    id: 'target',
    letter: 'AT',
    header: 'Target Net Margin %',
    width: 120,
    align: 'right',
    // one drives the recommended price at a time: a net take home set here wins over the margin
    cell: input('targetPct', 'Target margin', { suffix: '%', disabled: ({ values }) => values.netTakeHome !== null, title: ({ values }) => (values.netTakeHome !== null ? 'Net take home is set; clear it to use a target margin' : undefined) }),
  },
  {
    id: 'recommended',
    letter: 'AU',
    header: 'Recommended Selling Price',
    width: 140,
    align: 'right',
    cell: ({ result }, { currency }) =>
      result.recommendedPrice === null ? (
        DASH
      ) : typeof result.recommendedPrice === 'number' ? (
        <Figure bold>{formatCurrency(result.recommendedPrice, currency)}</Figure>
      ) : (
        <Figure tone="muted">{result.recommendedPrice.reason}</Figure>
      ),
  },
]
