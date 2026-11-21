import { useMemo } from 'react'
import { endOfMonth, format, parse } from 'date-fns'
import type { MonthValue } from '@/components/month-picker/MonthPicker'
import { useGetAccountsQuery } from '@/services/api/accounts.api'
import { useGetProfitByProductQuery, type ProductProfitBreakdown } from '@/services/api/profit.api'
import { skusOn, type ProductManager } from '@/services/api/productManagers.api'
import { useAppSelector } from '@/store/hooks'
import { ALL_MARKETPLACES } from '@/utils/profitDashboard.util'

/** Sales, ACoS and TACoS of one manager's SKUs over the month. */
export interface ManagerSales {
  /** Total sales (organic + ads). */
  salesUsd: number
  adSpendUsd: number
  /** Ad spend / sales Amazon attributes to the ads. */
  acosPct: number
  /** Ad spend / total sales. */
  tacosPct: number
  /** Managed SKUs that sold or spent on ads this month. */
  activeSkus: number
}

export const EMPTY_SALES: ManagerSales = { salesUsd: 0, adSpendUsd: 0, acosPct: 0, tacosPct: 0, activeSkus: 0 }

interface DayRange {
  startDate: string
  endDate: string
}

const DAY = 'yyyy-MM-dd'
const dayRange = (start: Date, end: Date): DayRange => ({ startDate: format(start, DAY), endDate: format(end, DAY) })

/** First and last day of a `YYYY-MM` month. */
export const monthRange = (month: MonthValue): DayRange => {
  const start = parse(month, 'yyyy-MM', new Date())
  return dayRange(start, endOfMonth(start))
}

/**
 * Amazon products from the profit-by-product report the Products page uses: one row per seller SKU,
 * in USD across every marketplace, for the account picked on the profit pages.
 */
function useAmazonProducts(range: DayRange, skip = false) {
  const accountFilter = useAppSelector((state) => state.profit.filters.accountId)
  const { data: accounts } = useGetAccountsQuery()
  const accountId = accountFilter || accounts?.[0]?.id
  const { data = [], isFetching, isError } = useGetProfitByProductQuery(
    { accountId, marketplaces: ALL_MARKETPLACES, currency: 'USD', groupBy: 'none', ...range },
    { skip: skip || !accountId },
  )
  return { rows: data, isFetching, isError }
}

function salesOf(rows: ProductProfitBreakdown[]): ManagerSales {
  if (!rows.length) return EMPTY_SALES
  const salesUsd = rows.reduce((sum, row) => sum + row.salesRevenue, 0)
  const adSpendUsd = rows.reduce((sum, row) => sum + Math.abs(row.advertisingCost), 0)
  const adSalesUsd = rows.reduce((sum, row) => sum + (row.advertisingSales ?? 0), 0)
  const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0)
  return { salesUsd, adSpendUsd, acosPct: pct(adSpendUsd, adSalesUsd), tacosPct: pct(adSpendUsd, salesUsd), activeSkus: rows.length }
}

/** Each manager's sales, ACoS and TACoS for the month, from only the SKUs they manage. */
export function useManagerSales(month: MonthValue, managers: ProductManager[]) {
  const range = useMemo(() => monthRange(month), [month])
  const { rows, isFetching, isError } = useAmazonProducts(range)

  const salesByManager = useMemo(() => {
    const bySku = new Map<string, ProductProfitBreakdown[]>()
    for (const row of rows) bySku.set(row.sku, [...(bySku.get(row.sku) ?? []), row])
    return new Map(managers.map((manager) => [manager.id, salesOf(skusOn(manager, 'amazon').flatMap((sku) => bySku.get(sku) ?? []))]))
  }, [rows, managers])

  return { salesByManager, isFetching, isError }
}
