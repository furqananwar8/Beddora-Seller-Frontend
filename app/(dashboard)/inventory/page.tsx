'use client'

import React from 'react'
import { PageHeader } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/design-system/cards'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/design-system/tables'
import { EmptyState } from '@/components/data-display'
// import { useGetProductsQuery } from '@/services/api/inventory.api'

/**
 * Inventory page
 * 
 * Business logic: Connect to inventory API
 * Example:
 * const { data, isLoading, error } = useGetProductsQuery({})
 */
export default function InventoryPage() {
  // const { data, isLoading, error } = useGetProductsQuery({})

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Manage your product inventory"
      />

      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No products found"
            description="Connect to the inventory API to see your products here"
          />
        </CardContent>
      </Card>
    </div>
  )
}

