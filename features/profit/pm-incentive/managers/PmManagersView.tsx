'use client'

import React, { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { RowActionsMenu } from '@/components/row-actions-menu/RowActionsMenu'
import { Badge } from '@/design-system/badges'
import { Button } from '@/design-system/buttons'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableStatusRow, TABLE_STATUS_VIEWPORT } from '@/design-system/tables'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppAbility } from '@/hooks/useAppAbility'
import {
  useDeleteProductManagerMutation,
  useGetManagerChannelsQuery,
  useGetProductManagersPageQuery,
  type ProductManager,
} from '@/services/api/productManagers.api'
import { useDebounce } from '@/utils/debounce'
import { ScreenSearch } from '@/features/finance/shared/ScreenSearch'
import { AssignProductsDialog } from './AssignProductsDialog'
import { ProductManagerDialog } from './ProductManagerDialog'
import { ViewProductsDialog } from './ViewProductsDialog'

const HEAD = 'text-center align-middle'
const CELL = 'text-center align-middle'
const COLUMNS = 4
const PAGE_SIZE = 20

/** Profit > PM Incentive > PM Managers: the product managers, the products each looks after, and their upkeep. */
export const PmManagersView: React.FC = () => {
  const canWrite = useAppAbility().can('write', 'profit:pm-incentive')
  const { success, failure } = useApiFeedback()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [page, setPage] = useState(1)
  const { data, isLoading, isFetching, isError } = useGetProductManagersPageQuery({ page, limit: PAGE_SIZE, search: debouncedSearch })
  const managers = data?.data ?? []
  const { data: channels = [] } = useGetManagerChannelsQuery()
  const [remove, { isLoading: isRemoving }] = useDeleteProductManagerMutation()

  // `null` closes the dialog, 'new' adds, a manager edits them
  const [editing, setEditing] = useState<ProductManager | 'new' | null>(null)
  const [assigning, setAssigning] = useState<ProductManager | null>(null)
  const [viewing, setViewing] = useState<ProductManager | null>(null)
  const [removing, setRemoving] = useState<ProductManager | null>(null)

  const channelName = (id: string) => channels.find((channel) => channel.id === id)?.name ?? id

  const confirmRemove = async () => {
    if (!removing) return
    try {
      await remove(removing.id).unwrap()
      success(`${removing.name} removed`)
      setRemoving(null)
    } catch (error) {
      failure(error, 'Could not remove the product manager')
    }
  }

  const actionsOf = (manager: ProductManager) => [
    { key: 'view', label: 'View products', onSelect: () => setViewing(manager) },
    { key: 'assign', label: 'Assign products', onSelect: () => setAssigning(manager) },
    { key: 'edit', label: 'Edit', onSelect: () => setEditing(manager) },
    { key: 'remove', label: 'Delete', tone: 'danger' as const, onSelect: () => setRemoving(manager) },
  ]

  return (
    <>
      <ScreenSearch
        placeholder="Search by name or email..."
        value={search}
        onChange={(value) => {
          setSearch(value)
          setPage(1)
        }}
      />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">PM Managers ({data?.totalRecords ?? 0})</h1>
          <p className="text-sm text-text-muted">Product managers and the products they look after on each sales channel</p>
        </div>
        {canWrite && (
          <Button type="button" size="sm" onClick={() => setEditing('new')}>
            + Add manager
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <div className={`max-h-[calc(100vh-340px)] overflow-auto ${TABLE_STATUS_VIEWPORT} ${isFetching ? 'opacity-70 transition-opacity' : ''}`}>
          <Table className="min-w-full">
            <TableHeader className="sticky top-0 z-10 bg-surface shadow-sm">
              <TableRow>
                <TableHead className={`${HEAD} min-w-[160px]`}>Name</TableHead>
                <TableHead className={`${HEAD} min-w-[220px]`}>Email</TableHead>
                <TableHead className={`${HEAD} min-w-[280px]`}>Products</TableHead>
                {canWrite && <TableHead className={HEAD}>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableStatusRow colSpan={COLUMNS} loading />
              ) : isError ? (
                <TableStatusRow colSpan={COLUMNS} tone="danger">
                  Could not load the product managers.
                </TableStatusRow>
              ) : managers.length === 0 ? (
                <TableStatusRow colSpan={COLUMNS}>{debouncedSearch ? 'No product managers match your search.' : 'No product managers yet.'}</TableStatusRow>
              ) : (
                managers.map((manager) => (
                  <TableRow key={manager.id}>
                    <TableCell className={`${CELL} font-medium text-text-primary`}>{manager.name}</TableCell>
                    <TableCell className={CELL}>{manager.email}</TableCell>
                    <TableCell className={CELL}>
                      {manager.products.length === 0 ? (
                        <span className="text-text-muted">No products assigned</span>
                      ) : (
                        <div className="flex flex-wrap justify-center gap-1.5">
                          {manager.products.map(({ channel, skus }) => (
                            <button key={channel} type="button" onClick={() => setViewing(manager)} title="View products" className="rounded-full hover:opacity-80">
                              <Badge variant="secondary" size="sm">
                                {channelName(channel)} · {skus.length} {skus.length === 1 ? 'product' : 'products'}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    {canWrite && (
                      <TableCell className={CELL}>
                        <RowActionsMenu label={manager.name} items={actionsOf(manager)} />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {data && data.totalRecords > 0 && (
          <PaginationFooter page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="managers" />
        )}
      </div>

      <ViewProductsDialog manager={viewing} channels={channels} onClose={() => setViewing(null)} />
      <ProductManagerDialog isOpen={editing !== null} manager={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      <AssignProductsDialog manager={assigning} onClose={() => setAssigning(null)} />

      <ConfirmDialog
        isOpen={removing !== null}
        title={`Delete ${removing?.name ?? 'product manager'}`}
        confirmLabel="Delete"
        tone="danger"
        busy={isRemoving}
        onConfirm={confirmRemove}
        onClose={() => setRemoving(null)}
      >
        <p>{removing?.name} is removed from the incentive plan and their products are released. This can&apos;t be undone.</p>
      </ConfirmDialog>
    </>
  )
}
