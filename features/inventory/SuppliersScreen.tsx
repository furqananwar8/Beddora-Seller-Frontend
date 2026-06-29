"use client"

import React, { useState, useMemo } from 'react'
import { Container } from '@/components/layout'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/design-system/tables'
import { useDebounce } from '@/utils/debounce'
import { useGetSuppliersQuery } from '@/services/api/suppliers.api'
import { mockSuppliers } from './mockSuppliers'

/**
 * Suppliers Screen Component
 *
 * Main screen for supplier management with search and table
 */
export const SuppliersScreen = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortColumn, setSortColumn] = useState<string>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const debouncedSearch = useDebounce(searchTerm, 300)

  // API Query
  const { data: suppliers, isLoading } = useGetSuppliersQuery(undefined, {
    pollingInterval: 0,
    refetchOnMountOrArgChange: false,
  })

  // Use mock data as fallback
  const displaySuppliers = suppliers || mockSuppliers

  // Filter and sort suppliers
  const filteredSuppliers = useMemo(() => {
    let result = [...displaySuppliers]

    // Search filter
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase()
      result = result.filter(
        (s) =>
          s.name?.toLowerCase().includes(lower) ||
          s.email?.toLowerCase().includes(lower) ||
          s.website?.toLowerCase().includes(lower)
      )
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortColumn as keyof typeof a] || ''
      let bVal: any = b[sortColumn as keyof typeof b] || ''

      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
    })

    return result
  }, [displaySuppliers, debouncedSearch, sortColumn, sortDirection])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  return (
    <Container size="full" className="py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary mb-6">Suppliers</h1>

        {/* Search Bar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-2xl">
            <input
              type="text"
              placeholder="Search by supplier name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-surface-primary border border-border-primary text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary-300 focus:border-primary-500"
            />
          </div>

          <button className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-text-primary bg-surface-primary border border-border-primary hover:bg-surface-secondary transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Filter
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden border border-border-primary bg-surface-primary">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-surface-secondary"
                  onClick={() => handleSort('name')}
                >
                  Supplier name{' '}
                  {sortColumn === 'name' && (
                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Website</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex items-center justify-center">
                      <svg
                        className="animate-spin h-8 w-8 text-primary-600"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-text-muted">
                    No data available
                  </TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.currency}</TableCell>
                    <TableCell>
                      {supplier.email ? (
                        <a
                          href={`mailto:${supplier.email}`}
                          className="text-primary-600 hover:underline"
                        >
                          {supplier.email}
                        </a>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {supplier.website ? (
                        <a
                          href={supplier.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:underline"
                        >
                          {supplier.website}
                        </a>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-text-muted">
                      {supplier.comment || '—'}
                    </TableCell>
                    <TableCell>
                      <button className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
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
    </Container>
  )
}
