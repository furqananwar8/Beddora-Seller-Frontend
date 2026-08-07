'use client'

import React, { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/design-system/tables'
import { Spinner, TableSkeleton } from '@/design-system/loaders'
import { CountryProfitBreakdown } from '@/services/api/profit.api'
import { StatModal, StatModalData } from '@/components/stats/stats.modal'
import { formatCurrency, formatNumber, formatPercentage } from '@/utils/format'
import { cn } from '@/utils/cn'

export interface RegionData extends CountryProfitBreakdown {
  region: string
  isExpandable?: boolean
  children?: RegionData[]
}

export interface RegionsTableProps {
  data?: RegionData[]
  isLoading?: boolean
  isFetching?: boolean
  searchTerm?: string
  currency?: string
  className?: string
}

const getCountryFlag = (code: string): string => {
  const map: Record<string, string> = {
    US: '🇺🇸', CA: '🇨🇦', GB: '🇬🇧', DE: '🇩🇪', FR: '🇫🇷',
    IT: '🇮🇹', ES: '🇪🇸', JP: '🇯🇵', AU: '🇦🇺', IN: '🇮🇳',
    BR: '🇧🇷', MX: '🇲🇽',
  }
  return map[code] || '🌍'
}

const buildDetailData = (d: RegionData, currency: string): StatModalData => {
  const flagMap: Record<string, string> = {
    US: '🇺🇸', CA: '🇨🇦', GB: '🇬🇧', DE: '🇩🇪', FR: '🇫🇷',
    IT: '🇮🇹', ES: '🇪🇸', JP: '🇯🇵', AU: '🇦🇺', IN: '🇮🇳',
    BR: '🇧🇷', MX: '🇲🇽',
  }

  return {
    title: d.region || d.country,
    flag: flagMap[d.country] || '🌎',
    sections: [
      {
        title: 'Sales', value: d.sales, currency: true, defaultOpen: true,
        children: [
          { label: 'Organic', value: 0, currency: true },
          { label: 'Sponsored Products (same day)', value: 0, currency: true },
          { label: 'Sponsored Display (same day)', value: 0, currency: true },
          { label: 'Direct sales', value: 0, currency: true },
          { label: 'Subscription sales (est.)', value: 0, currency: true },
        ],
      },
      {
        title: 'Units', value: d.unitsSold, defaultOpen: true,
        children: [
          { label: 'Organic', value: 0, integer: true },
          { label: 'Sponsored Products (same day)', value: 0, integer: true },
          { label: 'Sponsored Display (same day)', value: 0, integer: true },
          { label: 'Direct units', value: 0, integer: true },
          { label: 'Subscription units (est.)', value: 0, integer: true },
        ],
      },
      {
        title: 'Advertising cost', value: 0, currency: true,
        children: [
          { label: 'Sponsored Products', value: 0, currency: true },
          { label: 'Sponsored Brands Video', value: 0, currency: true },
          { label: 'Sponsored Display', value: 0, currency: true },
          { label: 'Sponsored Brands', value: 0, currency: true },
        ],
      },
      {
        title: 'Refund cost', value: Math.abs(d.refundCost), currency: true, defaultOpen: true,
        children: [
          { label: 'Refunded amount', value: Math.abs(d.refundCost), currency: true },
          { label: 'Refund commission', value: 0, currency: true },
          { label: 'Goodwill/Principal', value: 0, currency: true },
          { label: 'Promotion', value: 0, currency: true },
          { label: 'Refunded referral fee', value: 0, currency: true },
        ],
      },
      {
        title: 'Amazon fees', value: Math.abs(d.amazonFees), currency: true, defaultOpen: true,
        children: [
          { label: 'FBA per unit fulfillment fee', value: Math.abs(d.fbaFees || 0), currency: true },
          { label: 'Referral fee', value: Math.abs(d.sellingFees || 0), currency: true },
          { label: 'FBA per unit fulfillment fee_tax', value: 0, currency: true },
          { label: 'Commission_tax', value: 0, currency: true },
          { label: 'Sales tax collection fee', value: 0, currency: true },
          { label: 'FBA disposal fee', value: 0, currency: true },
          { label: 'Sales tax collection fee_tax', value: 0, currency: true },
          { label: 'Fba disposal fee_tax', value: 0, currency: true },
          { label: 'Digital services fee', value: 0, currency: true },
          { label: 'Adjustment FBA per unit fulfillment', value: 0, currency: true },
          { label: 'Reversal reimbursement', value: Math.abs(d.otherAmazonAdj || 0), currency: true },
        ],
      },
      {
        title: 'Cost of goods', value: Math.abs(d.costOfGoods), currency: true, defaultOpen: true,
        children: [
          { label: 'Cost of goods sold', value: Math.abs(d.costOfGoods), currency: true },
          { label: 'Buying price', value: Math.abs(d.cogsBuyingPrice || 0), currency: true },
          { label: 'Shipping price', value: Math.abs(d.cogsShippingPrice || 0), currency: true },
          { label: 'Import price', value: Math.abs(d.cogsImportPrice || 0), currency: true },
          { label: 'Disposal of sellable products', value: 0, currency: true },
          { label: 'Lost/damaged by Amazon', value: 0, currency: true },
          { label: 'Multi-channel', value: 0, currency: true },
          { label: 'Missing returns', value: 0, currency: true },
        ],
      },
    ],
    summaryRows: [
      { label: 'Refunds', value: d.totalReturns || 0, integer: true },
      { label: 'Promo', value: d.promoRebates || 0, currency: true },
      { label: 'VAT', value: 0, currency: true },
      { label: 'Gross profit', value: d.grossProfit, currency: true },
      { label: 'Indirect expenses', value: d.indirectExpenses || 0, currency: true },
      { label: 'Net profit', value: d.netProfit || 0, currency: true },
      { label: 'Estimated payout', value: 0, currency: true },
      { label: 'Real ACOS', value: 0, percentage: true },
      { label: '% Refunds', value: d.totalReturns > 0 ? (d.totalReturns / d.orders) * 100 : 0, percentage: true },
      { label: 'Sellable returns', value: d.sellableReturnsPercent || 0, percentage: true },
      { label: 'Margin', value: d.margin || 0, percentage: true },
      { label: 'ROI', value: d.roi || 0, percentage: true },
      { label: 'Active subscriptions (SnS)', value: 0, integer: true },
      { label: 'Sessions', value: 0, integer: true },
      { label: 'Unit session percentage', value: 0, percentage: true },
    ],
  }
}

export const RegionsTable: React.FC<RegionsTableProps> = ({
  data = [],
  isLoading,
  isFetching,
  searchTerm = '',
  currency = 'CAD',
  className,
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [sortColumn, setSortColumn] = useState<string>('unitsSold')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  /* ── StatModal popover state (now fully self-contained) ── */
  const [statModal, setStatModal] = useState<{
    data: StatModalData
    anchorRect: DOMRect
  } | null>(null)

  const toggleRow = (region: string) => {
    const next = new Set(expandedRows)
    if (next.has(region)) next.delete(region)
    else next.add(region)
    setExpandedRows(next)
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  const filteredAndSortedData = useMemo(() => {
    let result = [...data]
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      result = result.filter(
        (item) =>
          item.region?.toLowerCase().includes(lower) ||
          item.country?.toLowerCase().includes(lower)
      )
    }
    result.sort((a, b) => {
      let aVal: number | string = 0
      let bVal: number | string = 0
      switch (sortColumn) {
        case 'region':
          aVal = a.region || a.country || ''
          bVal = b.region || b.country || ''
          break
        case 'stock': aVal = a.stock || 0; bVal = b.stock || 0; break
        case 'orders': aVal = a.orders || 0; bVal = b.orders || 0; break
        case 'unitsSold': aVal = a.unitsSold || 0; bVal = b.unitsSold || 0; break
        case 'sales': aVal = a.sales || a.profit || 0; bVal = b.sales || b.profit || 0; break
        case 'amazonFees': aVal = a.amazonFees || 0; bVal = b.amazonFees || 0; break
        case 'grossProfit': aVal = a.grossProfit || a.profit || 0; bVal = b.grossProfit || b.profit || 0; break
        default: aVal = a.profit || 0; bVal = b.profit || 0
      }
      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal)
      }
      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number)
    })
    return result
  }, [data, searchTerm, sortColumn, sortDirection])

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return null
    return (
      <svg className={cn('w-4 h-4 inline-block ml-1', sortDirection === 'desc' && 'rotate-180')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    )
  }

  if (isLoading) return <TableSkeleton rows={5} columns={11} />
  if (data.length === 0) {
    return <div className="text-center py-8 text-text-muted"><p>No region data available</p></div>
  }

  return (
    <div className={cn('w-full overflow-x-auto relative', className)}>
      {/* Fetching overlay */}
      {isFetching && (
        <div className="absolute inset-0 bg-surface/60 z-20 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      )}

      {/* Reusable StatModal — popover mode when anchorRect is provided */}
      <StatModal
        isOpen={!!statModal}
        onClose={() => setStatModal(null)}
        data={statModal?.data || null}
        currency={currency}
        anchorRect={statModal?.anchorRect || null}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-surface z-10 min-w-[200px]">
              <button onClick={() => handleSort('region')} className="flex items-center gap-2 hover:text-primary-600">Region / Product <SortIcon column="region" /></button>
            </TableHead>
            <TableHead><button onClick={() => handleSort('stock')} className="flex items-center gap-2 hover:text-primary-600">Stock <SortIcon column="stock" /></button></TableHead>
            <TableHead><button onClick={() => handleSort('orders')} className="flex items-center gap-2 hover:text-primary-600">Orders <SortIcon column="orders" /></button></TableHead>
            <TableHead><button onClick={() => handleSort('unitsSold')} className="flex items-center gap-2 hover:text-primary-600">Units sold <SortIcon column="unitsSold" /></button></TableHead>
            <TableHead><button onClick={() => handleSort('sales')} className="flex items-center gap-2 hover:text-primary-600">Sales <SortIcon column="sales" /></button></TableHead>
            <TableHead><button onClick={() => handleSort('amazonFees')} className="flex items-center gap-2 hover:text-primary-600">Amazon fees <SortIcon column="amazonFees" /></button></TableHead>
            <TableHead>Sellable returns</TableHead>
            <TableHead>Cost of goods</TableHead>
            <TableHead>Refund cost</TableHead>
            <TableHead><button onClick={() => handleSort('grossProfit')} className="flex items-center gap-2 hover:text-primary-600">Gross profit <SortIcon column="grossProfit" /></button></TableHead>
            <TableHead>Info</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAndSortedData.map((region, index) => {
            const isExpanded = expandedRows.has(region.region || region.country)
            const hasChildren = region.children && region.children.length > 0
            const displayName = region.region || region.country || 'Unknown'

            return (
              <React.Fragment key={`${region.country}-${index}`}>
                <TableRow className="hover:bg-surface-secondary">
                  <TableCell className="sticky left-0 bg-surface z-10">
                    <div className="flex items-center gap-2">
                      {hasChildren && (
                        <button onClick={() => toggleRow(region.region || region.country)} className="p-1 hover:bg-surface-tertiary rounded">
                          <svg className={cn('w-4 h-4 text-text-muted transition-transform', isExpanded && 'rotate-90')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}
                      <span className="text-lg">{getCountryFlag(region.country)}</span>
                      <span className="font-medium">{displayName}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatNumber(region.stock || 0, 0)}</TableCell>
                  <TableCell>{formatNumber(region.orders || 0, 0)}</TableCell>
                  <TableCell>{formatNumber(region.unitsSold || 0, 0)}</TableCell>
                  <TableCell>{formatCurrency(region.sales || region.profit || 0, currency)}</TableCell>
                  <TableCell>{region.amazonFees !== undefined ? formatCurrency(region.amazonFees, currency) : '-'}</TableCell>
                  <TableCell>{region.sellableReturnsPercent !== undefined ? formatPercentage(region.sellableReturnsPercent) : '-'}</TableCell>
                  <TableCell>{region.costOfGoods !== undefined ? formatCurrency(region.costOfGoods, currency) : '-'}</TableCell>
                  <TableCell>{region.refundCost !== undefined ? formatCurrency(region.refundCost, currency) : '-'}</TableCell>
                  <TableCell>{formatCurrency(region.grossProfit || region.profit || 0, currency)}</TableCell>
                  <TableCell>
                    <button
                      onClick={(e) => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                        setStatModal({ data: buildDetailData(region, currency), anchorRect: rect })
                      }}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      More
                    </button>
                  </TableCell>
                </TableRow>

                {hasChildren && isExpanded && region.children && (
                  <>
                    {region.children.map((child, childIndex) => (
                      <TableRow key={`${child.country}-${childIndex}`} className="bg-surface-secondary hover:bg-surface-tertiary">
                        <TableCell className="sticky left-0 bg-surface-secondary z-10 pl-12">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getCountryFlag(child.country)}</span>
                            <span>{child.region || child.country}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatNumber(child.stock || 0, 0)}</TableCell>
                        <TableCell>{formatNumber(child.orders || 0, 0)}</TableCell>
                        <TableCell>{formatNumber(child.unitsSold || 0, 0)}</TableCell>
                        <TableCell>{formatCurrency(child.sales || child.profit || 0, currency)}</TableCell>
                        <TableCell>{child.amazonFees !== undefined ? formatCurrency(child.amazonFees, currency) : '-'}</TableCell>
                        <TableCell>{child.sellableReturnsPercent !== undefined ? formatPercentage(child.sellableReturnsPercent) : '-'}</TableCell>
                        <TableCell>{child.costOfGoods !== undefined ? formatCurrency(child.costOfGoods, currency) : '-'}</TableCell>
                        <TableCell>{child.refundCost !== undefined ? formatCurrency(child.refundCost, currency) : '-'}</TableCell>
                        <TableCell>{formatCurrency(child.grossProfit || child.profit || 0, currency)}</TableCell>
                        <TableCell>
                          <button
                            onClick={(e) => {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                              setStatModal({ data: buildDetailData(child, currency), anchorRect: rect })
                            }}
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                          >
                            More
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}
              </React.Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}