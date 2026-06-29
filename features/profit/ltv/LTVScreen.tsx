'use client'

import React, { useState, useMemo } from 'react'
import { Container } from '@/components/layout'
import { Button } from '@/design-system/buttons'
import { Input, Select } from '@/design-system/inputs'
import { Card, CardContent } from '@/design-system/cards'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/design-system/tables'
import { formatCurrency, formatNumber } from '@/utils/format'
import { useAppSelector } from '@/store/hooks'
import { useGetAccountsQuery } from '@/services/api/accounts.api'

interface ProductLTV {
  id: string
  sku: string
  productId: string
  name: string
  price: number
  currency: string
  ltv: {
    last3Months: number
    last6Months: number
    last12Months: number
    last24Months: number
  }
}

interface LTVMetrics {
  salesPerBuyer: {
    last3Months: number
    last6Months: number
    last12Months: number
    last24Months: number
  }
  unitsPerBuyer: {
    last3Months: number
    last6Months: number
    last12Months: number
    last24Months: number
  }
  ordersPerBuyer: {
    last3Months: number
    last6Months: number
    last12Months: number
    last24Months: number
  }
}

export const LTVScreen: React.FC = () => {
  const profitFilters = useAppSelector((state) => state.profit.filters)
  const { data: accountsData } = useGetAccountsQuery()

  const [searchTerm, setSearchTerm] = useState('')
  const [periodFilter, setPeriodFilter] = useState('all')
  const [marketplaceFilter, setMarketplaceFilter] = useState('all')
  const [activeMetric, setActiveMetric] = useState<'sales' | 'units' | 'orders'>('sales')

  // Sample LTV metrics
  const metrics: LTVMetrics = {
    salesPerBuyer: {
      last3Months: 28.98,
      last6Months: 30.21,
      last12Months: 30.21,
      last24Months: 30.22,
    },
    unitsPerBuyer: {
      last3Months: 1.20,
      last6Months: 1.21,
      last12Months: 1.22,
      last24Months: 1.22,
    },
    ordersPerBuyer: {
      last3Months: 1.07,
      last6Months: 1.08,
      last12Months: 1.09,
      last24Months: 1.09,
    },
  }

  // Sample product data
  const [products] = useState<ProductLTV[]>([
    {
      id: '1',
      sku: 'B0FNP2J2PXSKU Hangers-200',
      productId: 'B0FNP2J2PX',
      name: 'Beddora Black Velvet Hangers 200 Pack,Premium Non Slip V... nt Hangers',
      price: 82.99,
      currency: 'C$',
      ltv: {
        last3Months: 82.99,
        last6Months: 91.80,
        last12Months: 91.80,
        last24Months: 91.80,
      },
    },
    {
      id: '2',
      sku: 'B0FNNPJS7RSKU Hangers-100Pack',
      productId: 'B0FNNPJS7R',
      name: 'Beddora Pack of 100 Premium Non Slip Velvet Hangers 360 ... nt Hangers',
      price: 58.99,
      currency: 'C$',
      ltv: {
        last3Months: 76.32,
        last6Months: 61.53,
        last12Months: 61.53,
        last24Months: 61.53,
      },
    },
    {
      id: '3',
      sku: 'B0FK1D82IJSKU Lavender Pillow - Pack of 8',
      productId: 'B0FK1D82IJ',
      name: 'Shredded Memory Foam Pillows for Sleeping, Cooling Bambo...(Lavender)',
      price: 75.99,
      currency: 'C$',
      ltv: {
        last3Months: 75.99,
        last6Months: 75.30,
        last12Months: 75.30,
        last24Months: 75.30,
      },
    },
    {
      id: '4',
      sku: 'B0FNPH5GL5SKU Hangers-150Pack',
      productId: 'B0FNPH5GL5',
      name: 'Beddora Black Velvet Hangers 150 Pack Premium Non Slip V... nt Hangers',
      price: 68.99,
      currency: 'C$',
      ltv: {
        last3Months: 68.99,
        last6Months: 70.97,
        last12Months: 70.97,
        last24Months: 70.97,
      },
    },
    {
      id: '5',
      sku: 'B0FQZN88RQSKU BEDDORA-PP-STANDARD24PK-WHT',
      productId: 'B0FQZN88RQ',
      name: 'Beddora 24 Pack Pillow Protectors Standard Size - Waterpro... r Sleeping',
      price: 65.99,
      currency: 'C$',
      ltv: {
        last3Months: 65.99,
        last6Months: 65.99,
        last12Months: 65.99,
        last24Months: 65.99,
      },
    },
    {
      id: '6',
      sku: 'B0FQG16C5DSKU SherpaThrow-Gray Pack of 4',
      productId: 'B0FQG16C5D',
      name: 'Beddora Cozy Throw Blanket for Gift - Soft Fluffy Fleece Plush... Pack of 4)',
      price: 64.99,
      currency: 'C$',
      ltv: {
        last3Months: 64.99,
        last6Months: 64.99,
        last12Months: 64.99,
        last24Months: 64.99,
      },
    },
    {
      id: '7',
      sku: 'B0FK1L3B8NSKU Lavender Pillow - Pack of 4',
      productId: 'B0FK1L3B8N',
      name: 'Beddora Cooling Bamboo Memory Foam Pillow (Lavender) Qu... est Pillow',
      price: 65.99,
      currency: 'C$',
      ltv: {
        last3Months: 60.99,
        last6Months: 59.14,
        last12Months: 59.14,
        last24Months: 59.14,
      },
    },
    {
      id: '8',
      sku: 'B0FJ2NTXDKSKU BEDDORA-PP-KING4PK-WHT',
      productId: 'B0FJ2NTXDK',
      name: 'Beddora 4 Pack Pillow Protectors King Size - Waterproof Zippe... r Sleeping',
      price: 28.32,
      currency: 'C$',
      ltv: {
        last3Months: 58.26,
        last6Months: 28.32,
        last12Months: 28.32,
        last24Months: 28.32,
      },
    },
  ])

  const filteredProducts = useMemo(() => {
    let result = [...products]

    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      result = result.filter(
        (product) =>
          product.name.toLowerCase().includes(lower) ||
          product.sku.toLowerCase().includes(lower) ||
          product.productId.toLowerCase().includes(lower)
      )
    }

    return result
  }, [products, searchTerm])

  const handleApply = () => {
    // TODO: Apply filters
    console.log('Apply filters')
  }

  // Get current date ranges for column headers
  const getDateRange = (months: number): string => {
    const end = new Date()
    const start = new Date()
    start.setMonth(start.getMonth() - months)
    
    const formatDate = (date: Date) => {
      const day = date.getDate()
      const month = date.toLocaleString('en-US', { month: 'long' })
      const year = date.getFullYear()
      return `${day} ${month} ${year}`
    }

    return `${formatDate(start)} - ${formatDate(end)}`
  }

  return (
    <Container size="full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">LTV</h1>
      </div>

      {/* Search and Filters */}
      <div className="bg-surface border-b border-border mb-6">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
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

            {/* Filters */}
            <div className="flex items-center gap-3">
              <Select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Period' },
                  { value: '3months', label: 'Last 3 months' },
                  { value: '6months', label: 'Last 6 months' },
                  { value: '12months', label: 'Last 12 months' },
                  { value: '24months', label: 'Last 24 months' },
                ]}
                className="min-w-[140px]"
              />

              <Select
                value={marketplaceFilter}
                onChange={(e) => setMarketplaceFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All marketplaces' },
                  { value: 'amazon-us', label: 'Amazon.com' },
                  { value: 'amazon-ca', label: 'Amazon.ca' },
                ]}
                className="min-w-[160px]"
              />

              <Button variant="primary" onClick={handleApply}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Acc. sales per buyer (C$) */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-text-primary text-sm font-medium mb-4">Acc. sales per buyer (C$)</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              <div>
                <div className="text-text-muted text-xs mb-1">Last 3 months</div>
                <div className="text-text-primary text-lg font-semibold">
                  C$ {metrics.salesPerBuyer.last3Months.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-text-muted text-xs mb-1">Last 6 months</div>
                <div className="text-text-primary text-lg font-semibold">
                  C$ {metrics.salesPerBuyer.last6Months.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-text-muted text-xs mb-1">Last 12 months</div>
                <div className="text-text-primary text-lg font-semibold">
                  C$ {metrics.salesPerBuyer.last12Months.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-text-muted text-xs mb-1">Last 24 months</div>
                <div className="text-text-primary text-lg font-semibold">
                  C$ {metrics.salesPerBuyer.last24Months.toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acc. sales per buyer (units) */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-text-primary text-sm font-medium mb-4">Acc. sales per buyer (units)</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              <div>
                <div className="text-text-muted text-xs mb-1">Last 3 months</div>
                <div className="text-text-primary text-lg font-semibold">
                  {metrics.unitsPerBuyer.last3Months.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-text-muted text-xs mb-1">Last 6 months</div>
                <div className="text-text-primary text-lg font-semibold">
                  {metrics.unitsPerBuyer.last6Months.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-text-muted text-xs mb-1">Last 12 months</div>
                <div className="text-text-primary text-lg font-semibold">
                  {metrics.unitsPerBuyer.last12Months.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-text-muted text-xs mb-1">Last 24 months</div>
                <div className="text-text-primary text-lg font-semibold">
                  {metrics.unitsPerBuyer.last24Months.toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acc. orders per buyer (amount) */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-text-primary text-sm font-medium mb-4">Acc. orders per buyer (amount)</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              <div>
                <div className="text-text-muted text-xs mb-1">Last 3 months</div>
                <div className="text-text-primary text-lg font-semibold">
                  {metrics.ordersPerBuyer.last3Months.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-text-muted text-xs mb-1">Last 6 months</div>
                <div className="text-text-primary text-lg font-semibold">
                  {metrics.ordersPerBuyer.last6Months.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-text-muted text-xs mb-1">Last 12 months</div>
                <div className="text-text-primary text-lg font-semibold">
                  {metrics.ordersPerBuyer.last12Months.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-text-muted text-xs mb-1">Last 24 months</div>
                <div className="text-text-primary text-lg font-semibold">
                  {metrics.ordersPerBuyer.last24Months.toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Section */}
      <div className="mb-4">
        <h2 className="text-lg font-medium text-text-primary mb-4">Acc. sales per buyer (C$)</h2>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-surface z-10 whitespace-nowrap min-w-[350px]">
                      Product
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap min-w-[200px]">
                      <div>Last 3 months</div>
                      <div className="text-xs font-normal text-text-muted mt-1">
                        {getDateRange(3)}
                      </div>
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap min-w-[200px]">
                      <div>Last 6 months</div>
                      <div className="text-xs font-normal text-text-muted mt-1">
                        {getDateRange(6)}
                      </div>
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap min-w-[200px]">
                      <div>Last 12 months</div>
                      <div className="text-xs font-normal text-text-muted mt-1">
                        {getDateRange(12)}
                      </div>
                    </TableHead>
                    <TableHead className="text-center whitespace-nowrap min-w-[200px]">
                      <div>Last 24 months</div>
                      <div className="text-xs font-normal text-text-muted mt-1">
                        {getDateRange(24)}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <TableRow key={product.id} className="hover:bg-surface-secondary">
                        {/* Product Column */}
                        <TableCell className="sticky left-0 bg-surface z-10">
                          <div className="flex items-start gap-3">
                            {/* Product Image */}
                            <div className="w-12 h-12 bg-surface-secondary flex items-center justify-center flex-shrink-0">
                              <svg
                                className="w-6 h-6 text-text-muted"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                />
                              </svg>
                            </div>

                            {/* Product Info */}
                            <div className="min-w-0 flex-1">
                              <div className="text-xs text-text-muted mb-1">{product.sku}</div>
                              <div className="text-sm font-medium text-text-primary mb-1 line-clamp-2">
                                {product.name}
                              </div>
                              <div className="text-xs text-text-muted">
                                Price: <span className="text-text-primary font-medium">{product.currency} {product.price.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* LTV Columns */}
                        <TableCell className="text-center whitespace-nowrap">
                          <span className="text-sm font-medium">
                            {product.currency} {product.ltv.last3Months.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <span className="text-sm font-medium">
                            {product.currency} {product.ltv.last6Months.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <span className="text-sm font-medium">
                            {product.currency} {product.ltv.last12Months.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <span className="text-sm font-medium">
                            {product.currency} {product.ltv.last24Months.toFixed(2)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-text-muted py-8">
                        No products found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  )
}
