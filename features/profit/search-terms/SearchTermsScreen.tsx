'use client'

import React, { useState, useMemo } from 'react'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import { Input, Select } from '@/design-system/inputs'
import { Card, CardContent } from '@/design-system/cards'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/design-system/tables'
import { formatNumber } from '@/utils/format'

interface SearchTermData {
  searchTerm: string
  weeklyData: Record<string, number>
  trendData: number[]
}

interface ProductData {
  id: string
  sku: string
  name: string
  searchTerms: SearchTermData[]
  isExpanded: boolean
}

type ActiveTab = 'trends' | 'details'
type MetricTab = 
  | 'my-impressions'
  | 'volume'
  | 'impressions-share'
  | 'total-impressions'
  | 'my-clicks'
  | 'clicks-share'
  | 'total-clicks'
  | 'my-added-to-cart'
  | 'added-to-cart-share'
  | 'other'

export const SearchTermsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('trends')
  const [activeMetric, setActiveMetric] = useState<MetricTab>('my-impressions')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchTermFilter, setSearchTermFilter] = useState('')
  const [periodFilter, setPeriodFilter] = useState('weekly')
  const [marketplaceFilter, setMarketplaceFilter] = useState('amazon-ca')
  const [groupBy, setGroupBy] = useState('parent')
  const [heatmapEnabled, setHeatmapEnabled] = useState(true)

  // Sample data - products expanded by default to match reference
  const [products, setProducts] = useState<ProductData[]>([
    {
      id: '1',
      sku: 'B0G3CXQ8K5',
      name: 'Beddora Throw Pillows, Pillow Inserts for Sofa, Bed and Couch Decorative Stuffer Pillow',
      searchTerms: [
        {
          searchTerm: 'throw pillows 案',
          weeklyData: { 
            w4: 7023, w3: 9304, w2: 7660, w1: 10196, 
            w52: 7034, w51: 6647, w50: 6977, w49: 8475, 
            w48: 9927, w47: 8543, w46: 11234, w45: 4035 
          },
          trendData: [5000, 6000, 7000, 7500, 7023],
        },
        {
          searchTerm: 'throw pillow',
          weeklyData: { 
            w4: 1455, w3: 2070, w2: 1795, w1: 1900, 
            w52: 1615, w51: 1582, w50: 1608, w49: 1722, 
            w48: 2574, w47: 1795, w46: 2184, w45: 634 
          },
          trendData: [1200, 1300, 1400, 1450, 1455],
        },
        {
          searchTerm: '18x18 pillow inserts',
          weeklyData: { 
            w4: 826, w3: 814, w2: 703, w1: 858, 
            w52: 590, w51: 539, w50: 1919, w49: 1548, 
            w48: 1764, w47: 1026, w46: 964, w45: 203 
          },
          trendData: [800, 750, 780, 820, 826],
        },
      ],
      isExpanded: true,
    },
    {
      id: '2',
      sku: 'B0FJ2T7P5G',
      name: 'Waterproof PP Parent',
      searchTerms: [
        {
          searchTerm: 'pillow protectors',
          weeklyData: { 
            w4: 867, w3: 1013, w2: 572, w1: 433, 
            w52: 845, w51: 366, w50: 420, w49: 534, 
            w48: 716, w47: 670, w46: 1181, w45: 1148 
          },
          trendData: [700, 750, 800, 850, 867],
        },
        {
          searchTerm: 'pillow protectors king',
          weeklyData: { 
            w4: 221, w3: 183, w2: 168, w1: 268, 
            w52: 218, w51: 180, w50: 143, w49: 348, 
            w48: 363, w47: 194, w46: 177, w45: 191 
          },
          trendData: [150, 170, 190, 210, 221],
        },
        {
          searchTerm: 'king size pillow protector',
          weeklyData: { 
            w4: 183, w3: 154, w2: 209, w1: 211, 
            w52: 3, w51: 295, w50: 310, w49: 389, 
            w48: 274, w47: 135, w46: 203, w45: 272 
          },
          trendData: [140, 150, 165, 175, 183],
        },
      ],
      isExpanded: true,
    },
    {
      id: '3',
      sku: 'B0FXH4YVYX',
      name: 'Beddora Bed Pillows for Sleeping, Gusseted Hotel Quality Pillows, Cooling Pillows for Side, Back or Stomach Sleepers',
      searchTerms: [],
      isExpanded: false,
    },
  ])

  const weeks = [
    'Week 4', 'Week 3', 'Week 2', 'Week 1', 
    'Week 52', 'Week 51', 'Week 50', 'Week 49', 
    'Week 48', 'Week 47', 'Week 46', 'Week 45'
  ]

  const toggleProductExpansion = (productId: string) => {
    setProducts(
      products.map((p) =>
        p.id === productId ? { ...p, isExpanded: !p.isExpanded } : p
      )
    )
  }

  const getHeatmapColor = (value: number, maxValue: number): string => {
    if (!heatmapEnabled) return 'bg-surface'
    
    const ratio = value / maxValue
    // Deep green for highest values (>80%)
    if (ratio > 0.8) return 'bg-[#059669] text-white'
    // Medium green (60-80%)
    if (ratio > 0.6) return 'bg-[#34d399] text-gray-900'
    // Light green (40-60%)
    if (ratio > 0.4) return 'bg-[#86efac] text-gray-900'
    // Light peach/salmon (20-40%)
    if (ratio > 0.2) return 'bg-[#fca5a5] text-gray-900'
    // Medium orange (10-20%)
    if (ratio > 0.1) return 'bg-[#f97316] text-white'
    // Deep red for lowest values (<10%)
    return 'bg-[#dc2626] text-white'
  }

  const MiniChart: React.FC<{ data: number[] }> = ({ data }) => {
    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1

    // Create SVG path for line chart
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * 80 // 80px width
      const y = 32 - ((value - min) / range) * 28 // 32px height, 28px usable (4px padding)
      return { x, y, value }
    })

    const pathD = points.map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`
      return `L ${point.x} ${point.y}`
    }).join(' ')

    return (
      <svg width="80" height="32" className="inline-block">
        {/* Line path */}
        <path
          d={pathD}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Data points */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="2"
            fill="#3b82f6"
          />
        ))}
      </svg>
    )
  }

  const metricTabs: { id: MetricTab; label: string }[] = [
    { id: 'my-impressions', label: 'My impressions' },
    { id: 'volume', label: 'Volume' },
    { id: 'impressions-share', label: 'Impressions share, %' },
    { id: 'total-impressions', label: 'Total impressions' },
    { id: 'my-clicks', label: 'My clicks' },
    { id: 'clicks-share', label: 'Clicks share, %' },
    { id: 'total-clicks', label: 'Total clicks' },
    { id: 'my-added-to-cart', label: 'My added to cart' },
    { id: 'added-to-cart-share', label: 'Added to cart share, %' },
    { id: 'other', label: 'Other' },
  ]

  return (
    <Container size="full">
      {/* Page Header with Tabs */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-text-primary">Search Term Performance</h1>
        </div>

        {/* Main Tabs */}
        <div className="flex items-center gap-4 border-b border-border">
          <button
            onClick={() => setActiveTab('trends')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'trends'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Trends
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Details
          </button>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-surface border-b border-border mb-4">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            {/* Left: Search */}
            <div className="flex-1 max-w-md">
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

            {/* Right: Search term filter and controls */}
            <div className="flex items-center gap-3">
              <Input
                type="text"
                placeholder="Search term"
                value={searchTermFilter}
                onChange={(e) => setSearchTermFilter(e.target.value)}
                className="min-w-[200px]"
              />

              <Select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                options={[
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'daily', label: 'Daily' },
                ]}
                className="min-w-[120px]"
              />

              <Select
                value={marketplaceFilter}
                onChange={(e) => setMarketplaceFilter(e.target.value)}
                options={[
                  { value: 'amazon-ca', label: 'Amazon.ca' },
                  { value: 'amazon-us', label: 'Amazon.com' },
                  { value: 'amazon-uk', label: 'Amazon.co.uk' },
                ]}
                className="min-w-[140px]"
              />

              <Button variant="primary">Filter</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Tabs (Horizontal Scrollable) */}
      <div className="overflow-x-auto mb-4">
        <div className="flex items-center gap-2 min-w-max px-6">
          {metricTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveMetric(tab.id)}
              className={`px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                activeMetric === tab.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-secondary text-text-primary hover:bg-surface border border-border'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table Controls */}
      <div className="flex items-center justify-between mb-4 px-6">
        <div className="flex items-center gap-4">
          <Select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            options={[
              { value: 'parent', label: 'Group by parent' },
              { value: 'product', label: 'Group by product' },
              { value: 'category', label: 'Group by category' },
            ]}
            className="min-w-[160px]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Heatmap</span>
          <button
            onClick={() => setHeatmapEnabled(!heatmapEnabled)}
            className={`relative inline-flex h-6 w-11 items-center transition-colors ${
              heatmapEnabled ? 'bg-primary-600' : 'bg-surface-secondary'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform bg-white transition-transform ${
                heatmapEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Search Terms Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-surface z-10 whitespace-nowrap min-w-[350px]">
                    <div className="flex items-center gap-1">
                      Parent / Search term
                      <svg className="w-3 h-3 text-text-muted" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </TableHead>
                  <TableHead className="text-center whitespace-nowrap w-[150px]">Chart</TableHead>
                  {weeks.map((week) => (
                    <TableHead key={week} className="text-center whitespace-nowrap min-w-[100px]">
                      {week}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const allValues = product.searchTerms.flatMap((st) =>
                    Object.values(st.weeklyData)
                  )
                  const maxValue = Math.max(...allValues)

                  return (
                    <React.Fragment key={product.id}>
                      {/* Product Row */}
                      <TableRow className="bg-surface-secondary font-semibold">
                        <TableCell className="sticky left-0 bg-surface-secondary z-10">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleProductExpansion(product.id)}
                              className="p-1 hover:bg-surface transition-colors"
                            >
                              <svg
                                className={`w-4 h-4 transition-transform ${
                                  product.isExpanded ? 'rotate-90' : ''
                                }`}
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
                            <div className="w-10 h-10 bg-surface flex items-center justify-center flex-shrink-0">
                              <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs text-text-muted">{product.sku}</div>
                              <div className="text-sm font-medium truncate">{product.name}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell colSpan={weeks.length + 1} />
                      </TableRow>

                      {/* Search Term Rows (when expanded) */}
                      {product.isExpanded && product.searchTerms.length > 0 &&
                        product.searchTerms.map((searchTerm, index) => (
                          <TableRow key={index} className="hover:bg-surface-secondary">
                            <TableCell className="sticky left-0 bg-surface z-10 pl-16">
                              <span className="text-sm">{searchTerm.searchTerm}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center">
                                <MiniChart data={searchTerm.trendData} />
                              </div>
                            </TableCell>
                            {weeks.map((week) => {
                              const weekKey = `w${weeks.indexOf(week) + 1}`
                              const value = searchTerm.weeklyData[weekKey] || 0
                              return (
                                <TableCell
                                  key={week}
                                  className={`text-center font-medium ${getHeatmapColor(
                                    value,
                                    maxValue
                                  )}`}
                                >
                                  {formatNumber(value, 0)}
                                </TableCell>
                              )
                            })}
                          </TableRow>
                        ))}

                      {/* No data message when expanded but no search terms */}
                      {product.isExpanded && product.searchTerms.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={weeks.length + 2} className="text-center py-4 text-text-muted text-sm">
                            No search term data available for this product
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Load More Button */}
                      {!product.isExpanded && (
                        <TableRow>
                          <TableCell colSpan={weeks.length + 2} className="text-center py-2">
                            <button
                              onClick={() => toggleProductExpansion(product.id)}
                              className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
                            >
                              Load more
                            </button>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </Container>
  )
}
