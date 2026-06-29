'use client'

import React, { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Input, Select } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { Card, CardContent } from '@/design-system/cards'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/design-system/tables'
import { useDebounce } from '@/utils/debounce'

// Lazy load chart component
const PPCChart = dynamic(() => import('./PPCChart'), {
  loading: () => <div className="w-full h-80 flex items-center justify-center bg-surface"><span className="text-text-muted">Loading chart...</span></div>,
  ssr: false
})

type PPCTab = 'all-periods' | 'portfolios' | 'campaigns' | 'ad-groups' | 'keywords' | 'search-terms'

interface KeywordData {
  id: string
  name: string
  products: string
  costPerOrder: number
  adSpend: number
  clicks: number
  conversion: number
  orders: number
  units: number
  cpc: number
  ppcSales: number
  impressions: number
  sameSku: string
  acos: number
  profit: number
  margin: string
  breakEven: string
  breakEvenBid: number
  currentBid: number
  recommendation: number
  info: string
}

export const PPCDashboardEnhanced = React.memo(() => {
  const [activeTab, setActiveTab] = useState<PPCTab>('keywords')
  const [searchTerm, setSearchTerm] = useState('')
  // Debounce search term to avoid excessive filtering (300ms delay)
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [campaignFilter, setCampaignFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('last_3_months_week')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedOrders, setExpandedOrders] = useState(false)
  const [expandedAmazonFees, setExpandedAmazonFees] = useState(false)

  // Sample chart data
  const chartData = useMemo(() => {
    const weeks = []
    for (let i = 44; i <= 52; i++) {
      weeks.push({
        week: `Week ${i}\n2025`,
        adSpend: Math.random() * 1000 + 500,
        profit: Math.random() * 2000 - 500,
        acos: Math.random() * 60,
      })
    }
    for (let i = 1; i <= 4; i++) {
      weeks.push({
        week: `Week ${i}\n2026`,
        adSpend: Math.random() * 1000 + 500,
        profit: Math.random() * 2000 - 500,
        acos: Math.random() * 60,
      })
    }
    weeks.push({
      week: `26-27 Jan\n2026`,
      adSpend: 200,
      profit: 1800,
      acos: 35,
    })
    return weeks
  }, [])

  const tabs = [
    { id: 'all-periods' as const, label: 'All Periods' },
    { id: 'portfolios' as const, label: 'Portfolios' },
    { id: 'campaigns' as const, label: 'Campaigns' },
    { id: 'ad-groups' as const, label: 'Ad groups' },
    { id: 'keywords' as const, label: 'Keywords' },
    { id: 'search-terms' as const, label: 'Search terms' },
  ]

  // Sample keyword data
  const [keywords] = useState<KeywordData[]>([
    {
      id: '1',
      name: 'hangers (keyword)',
      products: '—',
      costPerOrder: 4.72,
      adSpend: 836.08,
      clicks: 507,
      conversion: 34.91,
      orders: 177,
      units: 196,
      cpc: 1.65,
      ppcSales: 5376.60,
      impressions: 12234,
      sameSku: '99%',
      acos: 15.55,
      profit: 100.65,
      margin: '2%',
      breakEven: '17%',
      breakEvenBid: 1.85,
      currentBid: 0.60,
      recommendation: 0,
      info: 'More',
    },
  ])

  const handleEdit = () => {
    console.log('Edit selected items')
  }

  const handleSave = () => {
    console.log('Save changes')
  }

  return (
    <div className="flex gap-3 w-full -mx-6 px-6">
      {/* Main Content */}
      <div className="flex-1 min-w-0 overflow-x-auto">
          {/* Page Header with Configuration */}
          <div className="mb-6 flex items-center justify-between w-full">
            <h1 className="text-2xl font-semibold text-text-primary">PPC Dashboard</h1>
            <button
              className="p-2 hover:bg-surface-secondary transition-colors"
              aria-label="Configuration"
            >
              <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {/* Filters Row */}
          <div className="flex items-center gap-3 mb-6 w-full overflow-x-auto">
            {/* Search */}
            <div className="flex-shrink-0" style={{ width: '250px' }}>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <Input
                  type="text"
                  placeholder="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>

            {/* Campaign Filter */}
            <div className="flex-shrink-0">
              <Select
                value={campaignFilter}
                onChange={(e) => setCampaignFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All campaigns' },
                  { value: 'campaign-1', label: 'Campaign 1' },
                  { value: 'campaign-2', label: 'Campaign 2' },
                ]}
                className="w-[200px]"
              />
            </div>

            {/* Period Filter */}
            <div className="flex-shrink-0">
              <Select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                options={[
                  { value: 'last_3_months_week', label: 'Last 3 months, by week' },
                  { value: 'last_6_months_week', label: 'Last 6 months, by week' },
                  { value: 'last_12_months_month', label: 'Last 12 months, by month' },
                ]}
                className="w-[220px]"
              />
            </div>

            {/* Status Filter */}
            <div className="flex-shrink-0">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All campaign statuses' },
                  { value: 'enabled', label: 'Enabled' },
                  { value: 'paused', label: 'Paused' },
                ]}
                className="w-[220px]"
              />
            </div>

            {/* More Filters Button */}
            <button className="flex-shrink-0 px-4 py-2 border border-border bg-surface hover:bg-surface-secondary transition-colors whitespace-nowrap text-sm flex items-center gap-2">
              <span>More filters</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Chart Section */}
          <Card className="mb-6 w-full">
            <CardContent className="p-6 w-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500"></div>
                    <span className="text-xs text-text-secondary">Ad spend</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500"></div>
                    <span className="text-xs text-text-secondary">Profit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500"></div>
                    <span className="text-xs text-text-secondary">ACOS</span>
                  </div>
                </div>
                <button className="text-primary hover:underline text-sm">Configuration</button>
              </div>

              <PPCChart data={chartData} />
            </CardContent>
          </Card>

          {/* Tabs */}
          <div className="border-b border-border mb-6 w-full">
            <div className="flex gap-6 w-full overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 px-1 border-b-2 transition-colors text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary text-primary font-medium'
                      : 'border-transparent text-text-muted hover:text-text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Keywords Table */}
          <Card className="w-full mb-6">
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full">
                <Table className="w-full table-auto">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 sticky left-0 bg-surface z-10">
                        <input type="checkbox" className="w-4 h-4" />
                      </TableHead>
                      <TableHead className="min-w-[250px] sticky left-12 bg-surface z-10">
                        <button className="flex items-center gap-1">
                          <span>Name</span>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-center min-w-[100px]">Products</TableHead>
                      <TableHead className="whitespace-nowrap text-right min-w-[120px]">Cost per order</TableHead>
                      <TableHead className="whitespace-nowrap text-right min-w-[110px]">Ad spend</TableHead>
                      <TableHead className="whitespace-nowrap text-right min-w-[80px]">Clicks</TableHead>
                      <TableHead className="whitespace-nowrap text-right min-w-[110px]">Conversion</TableHead>
                      <TableHead className="whitespace-nowrap text-right min-w-[80px]">Orders</TableHead>
                      <TableHead className="whitespace-nowrap text-right min-w-[80px]">Units</TableHead>
                      <TableHead className="whitespace-nowrap text-right min-w-[80px]">CPC</TableHead>
                      <TableHead className="whitespace-nowrap text-right min-w-[110px]">PPC sales</TableHead>
                      <TableHead className="whitespace-nowrap text-right min-w-[110px]">Impressions</TableHead>
                      <TableHead className="whitespace-nowrap text-right min-w-[140px]">Same SKU/ All SKU's</TableHead>
                      <TableHead className="whitespace-nowrap text-right min-w-[80px]">ACOS</TableHead>
                      <TableHead className="whitespace-nowrap text-right min-w-[100px]">Profit</TableHead>
                      <TableHead className="whitespace-nowrap text-right min-w-[80px]">Margin</TableHead>
                      <TableHead className="whitespace-nowrap text-right min-w-[140px]">Break even ACOS</TableHead>
                      <TableHead className="whitespace-nowrap text-right min-w-[130px]">Break Even Bid</TableHead>
                      <TableHead className="whitespace-nowrap text-right min-w-[110px]">Current bid</TableHead>
                      <TableHead className="whitespace-nowrap text-center min-w-[140px]">Bid recommendation</TableHead>
                      <TableHead className="whitespace-nowrap text-right min-w-[80px]">Info</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keywords.map((keyword) => (
                      <TableRow key={keyword.id}>
                        <TableCell className="sticky left-0 bg-surface z-10">
                          <input type="checkbox" className="w-4 h-4" />
                        </TableCell>
                        <TableCell className="sticky left-12 bg-surface z-10">
                          <button className="flex items-center gap-1 text-text-primary">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                              />
                            </svg>
                            <span>{keyword.name}</span>
                          </button>
                        </TableCell>
                        <TableCell className="text-center">{keyword.products}</TableCell>
                        <TableCell className="text-right">C$ {keyword.costPerOrder.toFixed(2)}</TableCell>
                        <TableCell className="text-right text-red-600">-C$ {keyword.adSpend.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{keyword.clicks}</TableCell>
                        <TableCell className="text-right">{keyword.conversion.toFixed(2)}%</TableCell>
                        <TableCell className="text-right">{keyword.orders}</TableCell>
                        <TableCell className="text-right">{keyword.units}</TableCell>
                        <TableCell className="text-right">C$ {keyword.cpc.toFixed(2)}</TableCell>
                        <TableCell className="text-right">C$ {keyword.ppcSales.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{keyword.impressions.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{keyword.sameSku}</TableCell>
                        <TableCell className="text-right">{keyword.acos.toFixed(2)}%</TableCell>
                        <TableCell className="text-right">C$ {keyword.profit.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{keyword.margin}</TableCell>
                        <TableCell className="text-right">{keyword.breakEven}</TableCell>
                        <TableCell className="text-right">C$ {keyword.breakEvenBid.toFixed(2)}</TableCell>
                        <TableCell className="text-right">C$ {keyword.currentBid.toFixed(2)}</TableCell>
                        <TableCell className="text-center">{keyword.recommendation === 0 ? '—' : keyword.recommendation}</TableCell>
                        <TableCell>
                          <button className="text-primary hover:underline text-sm">{keyword.info}</button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center gap-3 w-full">
            <Button variant="secondary" onClick={handleEdit}>
              <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Save
            </Button>
            <Button variant="secondary">
              <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export
            </Button>
          </div>
      </div>

      {/* Right Sidebar - Metrics */}
      <div className="w-56 flex-shrink-0">
          <Card>
            <CardContent className="p-3">
              {/* Date Range Buttons */}
              <div className="flex flex-col gap-1 mb-3">
                <button className="px-2 py-1 text-xs border border-border bg-surface hover:bg-surface-secondary transition-colors text-left">
                  26-27 Jan 2026
                </button>
                <button className="px-2 py-1 text-xs bg-primary text-white hover:bg-primary-dark transition-colors text-left">
                  Last 3 months
                </button>
              </div>

              {/* Metrics List */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary font-semibold truncate">PPC sales</span>
                  <span className="text-text-primary font-semibold ml-2 whitespace-nowrap">C$ 52,220.34</span>
                </div>

                {/* Orders - Expandable */}
                <div>
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setExpandedOrders(!expandedOrders)}
                      className="flex items-center text-text-secondary hover:text-text-primary truncate"
                    >
                      <svg 
                        className={`w-2 h-2 mr-1 flex-shrink-0 transition-transform ${expandedOrders ? 'rotate-90' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="truncate">Orders</span>
                    </button>
                    <span className="text-text-primary ml-2 whitespace-nowrap">1,720</span>
                  </div>
                  {expandedOrders && (
                    <div className="ml-4 mt-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary truncate">Clicks</span>
                        <span className="text-text-primary ml-2 whitespace-nowrap">12,418</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary truncate">Conversion</span>
                        <span className="text-text-primary ml-2 whitespace-nowrap">13.85%</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-text-secondary truncate">Promo</span>
                  <span className="text-red-600 ml-2 whitespace-nowrap">-C$ 2,371.04</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-text-secondary truncate">Ad spend</span>
                  <span className="text-red-600 ml-2 whitespace-nowrap">-C$ 18,018.38</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-text-secondary truncate">Refunds</span>
                  <span className="text-red-600 ml-2 whitespace-nowrap">-C$ 1,538.50</span>
                </div>

                {/* Amazon fees - Expandable */}
                <div>
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setExpandedAmazonFees(!expandedAmazonFees)}
                      className="flex items-center text-text-secondary hover:text-text-primary truncate"
                    >
                      <svg 
                        className={`w-2 h-2 mr-1 flex-shrink-0 transition-transform ${expandedAmazonFees ? 'rotate-90' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="truncate">Amazon fees</span>
                    </button>
                    <span className="text-red-600 ml-2 whitespace-nowrap">-C$ 27,376.04</span>
                  </div>
                  {expandedAmazonFees && (
                    <div className="ml-4 mt-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary truncate">FBA Fee</span>
                        <span className="text-red-600 ml-2 whitespace-nowrap">-C$ 17,397.70</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary truncate">FBA fee</span>
                        <span className="text-red-600 ml-2 whitespace-nowrap">-C$ 7,552.98</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-secondary truncate">Other amazon fees</span>
                        <span className="text-red-600 ml-2 whitespace-nowrap">-C$ 2,425.36</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-text-secondary truncate">COGS</span>
                  <span className="text-red-600 ml-2 whitespace-nowrap">-C$ 8,673.57</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-text-secondary truncate">Expenses</span>
                  <span className="text-text-primary ml-2 whitespace-nowrap">C$ 0.00</span>
                </div>

                <div className="border-t border-border pt-2 flex items-center justify-between">
                  <span className="text-text-secondary font-semibold truncate">Profit (estimated)</span>
                  <span className="text-red-600 font-semibold ml-2 whitespace-nowrap">-C$ 5,757.19</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-text-secondary truncate">Average CPC</span>
                  <span className="text-text-primary ml-2 whitespace-nowrap">C$ 1.45</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-text-secondary truncate">ACOS</span>
                  <span className="text-text-primary ml-2 whitespace-nowrap">34.50%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  )
})
