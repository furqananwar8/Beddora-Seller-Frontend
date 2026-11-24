'use client'

import React, { useState } from 'react'
import { ChoiceSelect } from '@/components/choice-select/ChoiceSelect'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { ExportExcelButton } from '@/components/export-button/ExportExcelButton'
import { FilterBar, FilterItem } from '@/components/filter-bar/FilterBar'
import { FilterMultiSelect } from '@/components/filter-bar/FilterMultiSelect'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { FormField } from '@/components/form-field/FormField'
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
import { AssignProductsDialog } from './AssignProductsDialog'
import { ProductManagerDialog } from './ProductManagerDialog'
import { ViewProductsDialog } from './ViewProductsDialog'

const HEAD = 'text-center align-middle'
const CELL = 'text-center align-middle'
import { usePageSize } from '@/hooks/usePageSize'
const PAGE_SIZE = 20

type Assignment = 'any' | 'assigned' | 'unassigned'

interface Filters extends Record<string, unknown> {
  search: string
  channels: string[]
  assignment: Assignment
}
const DEFAULT_FILTERS: Filters = { search: '', channels: [], assignment: 'any' }

const ASSIGNMENT_OPTIONS = [
  { value: 'any' as const, label: 'Any' },
  { value: 'assigned' as const, label: 'Has products' },
  { value: 'unassigned' as const, label: 'No products yet' },
]

/** Profit > PM Incentive > PM Managers: the product managers, the products each looks after, and their upkeep. */
export const PmManagersView: React.FC = () => {
  const canWrite = useAppAbility().can('write', 'profit:pm-incentive')
  const { success, failure } = useApiFeedback()
  const [page, setPage] = useState(1)
  const pageSize = usePageSize(PAGE_SIZE)
  const filters = useStagedFilters(DEFAULT_FILTERS, () => setPage(1))
  const { applied, draft, setDraft, changed } = filters
  const search = applied.search.trim()
  const assignment = applied.assignment === 'any' ? undefined : applied.assignment

  const { data, isLoading, isFetching, isError } = useGetProductManagersPageQuery({ page, limit: pageSize, search, channels: applied.channels, assignment })
  const managers = data?.data ?? []
  const { data: channels = [] } = useGetManagerChannelsQuery()
  const [remove, { isLoading: isRemoving }] = useDeleteProductManagerMutation()

  // `null` closes the dialog, 'new' adds, a manager edits them
  const [editing, setEditing] = useState<ProductManager | 'new' | null>(null)
  const [assigning, setAssigning] = useState<ProductManager | null>(null)
  const [viewing, setViewing] = useState<ProductManager | null>(null)
  const [removing, setRemoving] = useState<ProductManager | null>(null)

  const channelName = (id: string) => channels.find((channel) => channel.id === id)?.name ?? id
  const columns = canWrite ? 5 : 4

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

  const totalOf = (manager: ProductManager) => manager.products.reduce((sum, { skus }) => sum + skus.length, 0)

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 px-1 sm:mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">PM Managers{data ? ` (${data.totalRecords})` : ''}</h1>
          <p className="mt-1 text-sm text-text-muted">Product managers and the products they look after on each sales channel</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportExcelButton
            report="pm-managers"
            filters={{ search: search || undefined, channels: applied.channels.join(',') || undefined, assignment }}
            noun="PM managers export"
          />
          {canWrite && (
            <Button type="button" size="sm" onClick={() => setEditing('new')}>
              + Add manager
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-surface p-3 shadow-sm sm:p-4">
        <FilterBar pendingCount={changed.size} activeCount={filters.activeCount} onApply={filters.apply} onReset={filters.reset}>
          <FilterItem wide>
            <FormField label="Search" htmlFor="pmm-search">
              <input
                id="pmm-search"
                type="search"
                value={draft.search}
                onChange={(event) => setDraft('search', event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && filters.apply()}
                placeholder="Name or email..."
                className="ds-input ds-input-default rounded-lg"
              />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Channel" htmlFor="pmm-channels">
              <FilterMultiSelect
                id="pmm-channels"
                options={channels.map(({ id, name }) => ({ value: id, label: name }))}
                value={draft.channels}
                onChange={(value) => setDraft('channels', value)}
                anyLabel="Any channel"
                highlighted={changed.has('channels')}
              />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Products" htmlFor="pmm-assignment">
              <ChoiceSelect id="pmm-assignment" title="Products" value={draft.assignment} onChange={(value) => setDraft('assignment', value)} options={ASSIGNMENT_OPTIONS} />
            </FormField>
          </FilterItem>
        </FilterBar>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <div className={`max-h-[calc(100vh-420px)] overflow-auto ${TABLE_STATUS_VIEWPORT} ${isFetching ? 'opacity-70 transition-opacity' : ''}`}>
          <Table className="min-w-full">
            <TableHeader className="sticky top-0 z-10 bg-surface shadow-sm">
              <TableRow>
                <TableHead className={`${HEAD} min-w-[160px]`}>Name</TableHead>
                <TableHead className={`${HEAD} min-w-[220px]`}>Email</TableHead>
                <TableHead className={`${HEAD} min-w-[280px]`}>Products</TableHead>
                <TableHead className={`${HEAD} min-w-[90px]`}>Total</TableHead>
                {canWrite && <TableHead className={HEAD}>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableStatusRow colSpan={columns} loading />
              ) : isError ? (
                <TableStatusRow colSpan={columns} tone="danger">
                  Could not load the product managers.
                </TableStatusRow>
              ) : managers.length === 0 ? (
                <TableStatusRow colSpan={columns}>{filters.appliedCount > 0 ? 'No product managers match your filters.' : 'No product managers yet.'}</TableStatusRow>
              ) : (
                managers.map((manager) => (
                  <TableRow key={manager.id}>
                    <TableCell className={`${CELL} font-medium text-text-primary`}>{manager.name}</TableCell>
                    <TableCell className={CELL}>{manager.email}</TableCell>
                    <TableCell className={CELL}>
                      {manager.products.length === 0 ? (
                        canWrite ? (
                          <Button type="button" size="sm" variant="outline" onClick={() => setAssigning(manager)}>
                            Assign products
                          </Button>
                        ) : (
                          <span className="text-text-muted">No products assigned</span>
                        )
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
                    <TableCell className={`${CELL} font-mono tabular-nums`}>{totalOf(manager)}</TableCell>
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
          <PaginationFooter selectablePageSize page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="managers" />
        )}
      </div>

      <ViewProductsDialog manager={viewing} channels={channels} onClose={() => setViewing(null)} onAssign={canWrite ? (manager) => { setViewing(null); setAssigning(manager) } : undefined} />
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
