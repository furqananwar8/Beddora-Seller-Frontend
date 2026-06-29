'use client'

import React, { useState, useMemo } from 'react'
import { Container } from '@/components/layout'
import { Input } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { Badge } from '@/design-system/badges'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/design-system/tables'
import { mockEbayProducts } from './mockEbayProducts'
import type { EbayProduct } from '@/services/api/ebayProducts.api'

/**
 * EbayProductsScreen Component
 * 
 * Displays eBay products with ability to link to Amazon, manage tags, and edit COGS/shipping costs
 */
export const EbayProductsScreen = React.memo(() => {
  const [products, setProducts] = useState<EbayProduct[]>(mockEbayProducts)
  const [searchTerm, setSearchTerm] = useState('')

  // Filter products based on search term
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products

    const search = searchTerm.toLowerCase()
    return products.filter(
      (product) =>
        product.sku.toLowerCase().includes(search) ||
        product.title.toLowerCase().includes(search)
    )
  }, [products, searchTerm])

  const handleCOGSChange = (id: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, cogs: numValue } : p))
    )
  }

  const handleShippingCostChange = (id: string, value: string) => {
    if (value === 'auto') {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, fbmShippingCost: 'auto' } : p))
      )
    } else {
      const numValue = parseFloat(value) || 0
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, fbmShippingCost: numValue } : p))
      )
    }
  }

  return (
    <Container size="full">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Products</h1>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"
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
                className="w-full pl-10 pr-4 py-2.5"
              />
            </div>
          </div>

          {/* Filter Button */}
          <Button variant="secondary" className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter
          </Button>
        </div>

        {/* Products Table */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[400px]">
                    <div className="flex items-center gap-1">
                      eBay product
                      <button className="text-text-muted hover:text-text-primary">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                        </svg>
                      </button>
                    </div>
                  </TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Amazon product</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      eBay listing status
                      <button className="text-text-muted hover:text-text-primary">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                        </svg>
                      </button>
                    </div>
                  </TableHead>
                  <TableHead>COGS</TableHead>
                  <TableHead>FBM shipping cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-text-muted">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      {/* eBay Product */}
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <img
                            src={product.image}
                            alt={product.title}
                            className="w-12 h-12 object-cover rounded border border-border flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.src = 'https://via.placeholder.com/60x60?text=Product'
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-text-muted mb-1">{product.sku}</div>
                            <div className="text-sm text-text-primary mb-1 line-clamp-2">
                              {product.title}
                            </div>
                            <div className="text-sm text-text-muted">
                              Price: C$ {product.price.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Tags */}
                      <TableCell>
                        <button className="text-sm text-primary hover:text-primary-dark">
                          Add
                        </button>
                      </TableCell>

                      {/* Amazon Product Link */}
                      <TableCell>
                        <button className="text-sm text-primary hover:text-primary-dark">
                          Link to an amazon product
                        </button>
                      </TableCell>

                      {/* Listing Status */}
                      <TableCell>
                        <Badge variant="success">Listed</Badge>
                      </TableCell>

                      {/* COGS */}
                      <TableCell>
                        <Input
                          type="text"
                          value={`C$ ${product.cogs.toFixed(2)}`}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, '')
                            handleCOGSChange(product.id, value)
                          }}
                          className="w-24 text-sm"
                        />
                      </TableCell>

                      {/* FBM Shipping Cost */}
                      <TableCell>
                        {product.fbmShippingCost === 'auto' ? (
                          <span className="text-sm text-text-primary">Auto</span>
                        ) : (
                          <Input
                            type="text"
                            value={`C$ ${product.fbmShippingCost.toFixed(2)}`}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9.]/g, '')
                              handleShippingCostChange(product.id, value)
                            }}
                            className="w-24 text-sm"
                          />
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <button className="p-1 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Bottom Action Buttons */}
        <div className="flex items-center gap-3">
          <Button variant="secondary">Import</Button>
          <Button variant="secondary">Export</Button>
          <Button variant="secondary">Refresh</Button>
          <div className="flex-1" />
          <Button variant="primary">Save</Button>
        </div>
      </div>
    </Container>
  )
})

EbayProductsScreen.displayName = 'EbayProductsScreen'
