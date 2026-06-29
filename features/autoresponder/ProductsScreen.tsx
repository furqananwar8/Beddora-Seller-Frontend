'use client'

import React, { useState } from 'react'
import { Container } from '@/components/layout'
import { Input } from '@/design-system/inputs'
import { Button } from '@/design-system/buttons'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/design-system/tables'
import { mockAutoresponderProducts } from './mockProducts'

export const ProductsScreen = React.memo(() => {
  const [products, setProducts] = useState(mockAutoresponderProducts)
  const [searchTerm, setSearchTerm] = useState('')

  const handleImport = () => {
    console.log('Import products')
  }

  const handleSave = () => {
    console.log('Save changes')
  }

  const filteredProducts = products.filter((product) =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Container size="full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Products</h1>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 relative">
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
        <button className="flex items-center gap-2 px-4 py-2 border border-border bg-surface hover:bg-surface-secondary transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          <span className="text-sm">Filter</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-2/3">Product</TableHead>
                <TableHead className="w-1/6">Campaign</TableHead>
                <TableHead className="w-1/6">Nickname (product_short_name)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12">
                    <div className="text-text-muted">No products found</div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="w-14 h-14 object-cover rounded border border-border flex-shrink-0"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"%3E%3Crect width="60" height="60" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%239ca3af"%3EProduct%3C/text%3E%3C/svg%3E'
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-text-muted mb-1">{product.sku}</div>
                          <div className="text-sm text-text-primary leading-relaxed">
                            {product.title}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={product.campaign || ''}
                        onChange={(e) => {
                          const updatedProducts = products.map((p) =>
                            p.id === product.id ? { ...p, campaign: e.target.value } : p
                          )
                          setProducts(updatedProducts)
                        }}
                        className="w-full text-sm"
                        placeholder=""
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={product.nickname || ''}
                        onChange={(e) => {
                          const updatedProducts = products.map((p) =>
                            p.id === product.id ? { ...p, nickname: e.target.value } : p
                          )
                          setProducts(updatedProducts)
                        }}
                        className="w-full text-sm"
                        placeholder=""
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center justify-between">
        <Button variant="secondary" onClick={handleImport}>
          Import
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save
        </Button>
      </div>
    </Container>
  )
})

ProductsScreen.displayName = 'ProductsScreen'
