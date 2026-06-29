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
import { Button } from '@/design-system/buttons'
import { TableSkeleton } from '@/design-system/loaders'
import { CountryProfitBreakdown } from '@/services/api/profit.api'
import { formatCurrency, formatNumber, formatPercentage } from '@/utils/format'
import { cn } from '@/utils/cn'

/**
 * Extended region data interface
 * Includes all metrics needed for the regions table
 */
export interface RegionData extends CountryProfitBreakdown {
  region: string // Display name (e.g., "Canada", "California", "Florida")
  stock?: number
  unitsSold?: number
  sales?: number
  amazonFees?: number
  sellableReturns?: number
  sellableReturnsPercent?: number
  costOfGoods?: number
  refundCost?: number
  grossProfit?: number
  isExpandable?: boolean
  children?: RegionData[] // For nested regions (e.g., states within countries)
}

export interface RegionsTableProps {
  data?: RegionData[]
  isLoading?: boolean
  searchTerm?: string
  currency?: string
  className?: string
}

/**
 * Get country flag emoji or icon
 */
const getCountryFlag = (countryCode: string): string => {
  const flagMap: Record<string, string> = {
    US: '🇺🇸',
    CA: '🇨🇦',
    GB: '🇬🇧',
    DE: '🇩🇪',
    FR: '🇫🇷',
    IT: '🇮🇹',
    ES: '🇪🇸',
    JP: '🇯🇵',
    AU: '🇦🇺',
    IN: '🇮🇳',
    BR: '🇧🇷',
    MX: '🇲🇽',
  }
  return flagMap[countryCode] || '🌍'
}

/**
 * RegionsTable Component
 * 
 * Displays profit data by region in a table format
 * Supports expandable rows for nested regions
 */
export const RegionsTable: React.FC<RegionsTableProps> = ({
  data = [],
  isLoading,
  searchTerm = '',
  currency = 'CAD',
  className,
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [sortColumn, setSortColumn] = useState<string>('unitsSold')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const toggleRow = (region: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(region)) {
      newExpanded.delete(region)
    } else {
      newExpanded.add(region)
    }
    setExpandedRows(newExpanded)
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
  }

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let result = [...data]

    // Filter by search term
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      result = result.filter(
        (item) =>
          item.region?.toLowerCase().includes(lower) ||
          item.country?.toLowerCase().includes(lower)
      )
    }

    // Sort
    result.sort((a, b) => {
      let aVal: number | string = 0
      let bVal: number | string = 0

      switch (sortColumn) {
        case 'region':
          aVal = a.region || a.country || ''
          bVal = b.region || b.country || ''
          break
        case 'stock':
          aVal = a.stock || 0
          bVal = b.stock || 0
          break
        case 'orders':
          aVal = a.orders || 0
          bVal = b.orders || 0
          break
        case 'unitsSold':
          aVal = a.unitsSold || 0
          bVal = b.unitsSold || 0
          break
        case 'sales':
          aVal = a.sales || a.profit || 0
          bVal = b.sales || b.profit || 0
          break
        case 'amazonFees':
          aVal = a.amazonFees || 0
          bVal = b.amazonFees || 0
          break
        case 'grossProfit':
          aVal = a.grossProfit || a.profit || 0
          bVal = b.grossProfit || b.profit || 0
          break
        default:
          aVal = a.profit || 0
          bVal = b.profit || 0
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal)
      }

      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
    })

    return result
  }, [data, searchTerm, sortColumn, sortDirection])

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return null
    return (
      <svg
        className={cn('w-4 h-4 inline-block ml-1', sortDirection === 'desc' && 'rotate-180')}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    )
  }

  if (isLoading) {
    return <TableSkeleton rows={5} columns={11} />
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted">
        <p>No region data available</p>
      </div>
    )
  }

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-surface z-10 min-w-[200px]">
              <button
                onClick={() => handleSort('region')}
                className="flex items-center gap-2 hover:text-primary-600"
              >
                Region / Product
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSort('stock')}
                className="flex items-center gap-2 hover:text-primary-600"
              >
                Stock
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSort('orders')}
                className="flex items-center gap-2 hover:text-primary-600"
              >
                Orders
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSort('unitsSold')}
                className="flex items-center gap-2 hover:text-primary-600"
              >
                Units sold
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSort('sales')}
                className="flex items-center gap-2 hover:text-primary-600"
              >
                Sales
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSort('amazonFees')}
                className="flex items-center gap-2 hover:text-primary-600"
              >
                Amazon fees
              </button>
            </TableHead>
            <TableHead>Sellable returns</TableHead>
            <TableHead>Cost of goods</TableHead>
            <TableHead>Refund cost</TableHead>
            <TableHead>
              <button
                onClick={() => handleSort('grossProfit')}
                className="flex items-center gap-2 hover:text-primary-600"
              >
                Gross profit
              </button>
            </TableHead>
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
                        <button
                          onClick={() => toggleRow(region.region || region.country)}
                          className="p-1 hover:bg-surface-tertiary rounded"
                        >
                          <svg
                            className={cn(
                              'w-4 h-4 text-text-muted transition-transform',
                              isExpanded && 'rotate-90'
                            )}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
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
                  <TableCell>
                    {formatCurrency(region.sales || region.profit || 0, currency)}
                  </TableCell>
                  <TableCell>
                    {region.amazonFees !== undefined
                      ? formatCurrency(region.amazonFees, currency)
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {region.sellableReturnsPercent !== undefined
                      ? formatPercentage(region.sellableReturnsPercent)
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {region.costOfGoods !== undefined
                      ? formatCurrency(region.costOfGoods, currency)
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {region.refundCost !== undefined
                      ? formatCurrency(region.refundCost, currency)
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(region.grossProfit || region.profit || 0, currency)}
                  </TableCell>
                  <TableCell>
                    <button className="text-primary-600 hover:text-primary-700 text-sm">
                      More
                    </button>
                  </TableCell>
                </TableRow>
                {hasChildren && isExpanded && region.children && (
                  <>
                    {region.children.map((child, childIndex) => (
                      <TableRow
                        key={`${child.country}-${childIndex}`}
                        className="bg-surface-secondary hover:bg-surface-tertiary"
                      >
                        <TableCell className="sticky left-0 bg-surface-secondary z-10 pl-12">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getCountryFlag(child.country)}</span>
                            <span>{child.region || child.country}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatNumber(child.stock || 0, 0)}</TableCell>
                        <TableCell>{formatNumber(child.orders || 0, 0)}</TableCell>
                        <TableCell>{formatNumber(child.unitsSold || 0, 0)}</TableCell>
                        <TableCell>
                          {formatCurrency(child.sales || child.profit || 0, currency)}
                        </TableCell>
                        <TableCell>
                          {child.amazonFees !== undefined
                            ? formatCurrency(child.amazonFees, currency)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {child.sellableReturnsPercent !== undefined
                            ? formatPercentage(child.sellableReturnsPercent)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {child.costOfGoods !== undefined
                            ? formatCurrency(child.costOfGoods, currency)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {child.refundCost !== undefined
                            ? formatCurrency(child.refundCost, currency)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(child.grossProfit || child.profit || 0, currency)}
                        </TableCell>
                        <TableCell>
                          <button className="text-primary-600 hover:text-primary-700 text-sm">
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
