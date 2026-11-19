'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { SegmentedToggle } from '@/components/segmented-toggle/SegmentedToggle'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { Badge } from '@/design-system/badges'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableStatusRow, TABLE_STATUS_VIEWPORT } from '@/design-system/tables'
import { useGetProductImportRowsQuery, type ProductImport, type ProductImportRow } from '@/services/api/procurement.api'

const PAGE_SIZE = 10

interface ImportResultsTableProps {
  item: ProductImport
}

/** What became of each product of a finished import: the created ones, and the ones skipped with the reason. */
export const ImportResultsTable: React.FC<ImportResultsTableProps> = ({ item }) => {
  const [status, setStatus] = useState<ProductImportRow['status']>('CREATED')
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useGetProductImportRowsQuery({ importId: item.id, status, page, limit: PAGE_SIZE })

  return (
    <section className="space-y-3">
      <SegmentedToggle<ProductImportRow['status']>
        ariaLabel="Import results"
        value={status}
        onChange={(next) => {
          setStatus(next)
          setPage(1)
        }}
        options={[
          { value: 'CREATED', label: `Created (${item.createdProducts})` },
          { value: 'FAILED', label: `Skipped (${item.failedProducts})` },
        ]}
      />
      <div className="overflow-hidden rounded-lg border border-border">
        <div className={`max-h-72 overflow-auto ${TABLE_STATUS_VIEWPORT}`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Row</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Variations</TableHead>
                <TableHead>{status === 'CREATED' ? 'Result' : 'Why it was skipped'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading || isError || !data?.data.length ? (
                <TableStatusRow colSpan={4} loading={isLoading} tone={isError ? 'danger' : 'muted'}>
                  {isError ? 'Could not load the results' : status === 'CREATED' ? 'No product was created.' : 'Nothing was skipped.'}
                </TableStatusRow>
              ) : (
                data.data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.rowNumber}</TableCell>
                    <TableCell className="font-medium text-text-primary">{row.name}</TableCell>
                    <TableCell>{row.variationCount}</TableCell>
                    <TableCell className="whitespace-normal">
                      {row.status === 'CREATED' ? (
                        <span className="flex items-center gap-2">
                          <Badge variant="success" size="sm">
                            Created
                          </Badge>
                          {row.productId && (
                            <Link href={`/dashboard/procurement/products/${row.productId}`} className="text-sm text-primary-600 hover:underline">
                              Open
                            </Link>
                          )}
                        </span>
                      ) : (
                        <span className="text-danger-700">{row.error}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {data && <PaginationFooter page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="products" />}
      </div>
    </section>
  )
}
