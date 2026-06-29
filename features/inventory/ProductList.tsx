'use client'

import React from 'react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/design-system/tables'
import { Badge } from '@/design-system/badges'
// import { useGetProductsQuery } from '@/services/api/inventory.api'

/**
 * ProductList component
 * 
 * Feature component for displaying products
 * Connect to inventory API here
 */
export const ProductList: React.FC = () => {
  // const { data, isLoading, error } = useGetProductsQuery({})

  // Example data structure
  const products = [
    { id: '1', name: 'Product 1', sku: 'SKU001', quantity: 10, status: 'in_stock' },
    { id: '2', name: 'Product 2', sku: 'SKU002', quantity: 5, status: 'low_stock' },
  ]

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error'> = {
      in_stock: 'success',
      low_stock: 'warning',
      out_of_stock: 'error',
    }
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>SKU</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id}>
            <TableCell>{product.name}</TableCell>
            <TableCell>{product.sku}</TableCell>
            <TableCell>{product.quantity}</TableCell>
            <TableCell>{getStatusBadge(product.status)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

