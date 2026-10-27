'use client'

import React, { useMemo, useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog/ConfirmDialog'
import { FilterBar, FilterItem } from '@/components/filter-bar/FilterBar'
import { FilterMultiSelect, type FilterOption } from '@/components/filter-bar/FilterMultiSelect'
import { useStagedFilters } from '@/components/filter-bar/useStagedFilters'
import { FormField } from '@/components/form-field/FormField'
import { PaginationFooter } from '@/components/pagination-footer/PaginationFooter'
import { RowActionsMenu } from '@/components/row-actions-menu/RowActionsMenu'
import { Button } from '@/design-system/buttons'
import { Spinner } from '@/design-system/loaders'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useGetCountriesQuery } from '@/services/api/geo.api'
import { useDeleteWarehouseMutation, useGetWarehouseFilterOptionsQuery, useGetWarehousesQuery, type Warehouse } from '@/services/api/warehouses.api'
import { cn } from '@/utils/cn'
import { WarehouseFormModal } from './WarehouseFormModal'

const PAGE_SIZE = 20

/** Search is staged with the other boxes: nothing reloads until "Apply filters". */
const DEFAULT_FILTERS = { search: '', countries: [] as string[], provinces: [] as string[] }

const HEAD = 'px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted'
const CELL = 'px-4 py-3 align-top text-sm'

/** Settings > Warehouses: the organisation's own warehouse locations, searchable and filtered by country and state. */
export const WarehousesScreen: React.FC = () => {
  const canEdit = useAppAbility().can('write', 'settings:warehouses')
  const { success, failure } = useApiFeedback()
  const [page, setPage] = useState(1)
  const filters = useStagedFilters(DEFAULT_FILTERS, () => setPage(1))
  const { draft, setDraft, applied, changed } = filters

  const { data, isLoading, isFetching, isError } = useGetWarehousesQuery({ page, limit: PAGE_SIZE, ...applied })
  const { data: options, isLoading: loadingOptions } = useGetWarehouseFilterOptionsQuery()
  const { data: countries = [] } = useGetCountriesQuery()
  const [remove, { isLoading: removing }] = useDeleteWarehouseMutation()
  const [editing, setEditing] = useState<Warehouse | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Warehouse | null>(null)

  const countryNames = useMemo(() => new Map(countries.map((country) => [country.code, country.name])), [countries])
  const countryOptions: FilterOption[] = (options?.countries ?? []).map((code) => ({ value: code, label: countryNames.get(code) ?? code }))
  // States of the picked countries only, so the list stays short and every pick narrows something
  const provinceOptions: FilterOption[] = (options?.provinces ?? [])
    .filter((province) => draft.countries.length === 0 || draft.countries.includes(province.country))
    .map((province) => ({ value: province.code, label: `${province.code} · ${countryNames.get(province.country) ?? province.country}` }))

  const rows = data?.data ?? []
  const filtered = filters.appliedCount > 0

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await remove(deleting.id).unwrap()
      success(`${deleting.name} deleted`)
      setDeleting(null)
      // Removing the last row of a page shows the page before it
      if (rows.length === 1 && page > 1) setPage(page - 1)
    } catch (error) {
      failure(error, 'Could not delete the warehouse')
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-primary">Filters</h2>
          <p className="text-xs text-text-muted">Type a search or pick filters, then apply</p>
        </div>
        <FilterBar pendingCount={changed.size} activeCount={filters.activeCount} onApply={filters.apply} onReset={filters.reset}>
          <FilterItem wide>
            <FormField label="Search" htmlFor="warehouse-filter-search">
              <input
                id="warehouse-filter-search"
                type="search"
                value={draft.search}
                onChange={(event) => setDraft('search', event.target.value)}
                // Enter applies, like the button
                onKeyDown={(event) => event.key === 'Enter' && filters.apply()}
                placeholder="Name, address, city or postal code"
                className={cn('ds-input ds-input-default rounded-lg', changed.has('search') && 'border-primary-500 ring-1 ring-primary-500')}
              />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="Country" htmlFor="warehouse-filter-country">
              <FilterMultiSelect
                id="warehouse-filter-country"
                options={countryOptions}
                value={draft.countries}
                onChange={(value) => setDraft('countries', value)}
                anyLabel="Any country"
                highlighted={changed.has('countries')}
                loading={loadingOptions}
              />
            </FormField>
          </FilterItem>
          <FilterItem>
            <FormField label="State / province" htmlFor="warehouse-filter-province">
              <FilterMultiSelect
                id="warehouse-filter-province"
                options={provinceOptions}
                value={draft.provinces}
                onChange={(value) => setDraft('provinces', value)}
                anyLabel="Any state"
                highlighted={changed.has('provinces')}
                loading={loadingOptions}
              />
            </FormField>
          </FilterItem>
        </FilterBar>
      </div>

      <div className={cn('overflow-hidden rounded-lg border border-border bg-surface shadow-sm', isFetching && 'opacity-70 transition-opacity')}>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h3 className="text-base font-semibold text-text-primary">Warehouse locations</h3>
            <p className="mt-1 text-sm text-text-muted">Your own warehouses, with their address and location.</p>
          </div>
          {canEdit && <Button onClick={() => setEditing('new')}>+ Add warehouse</Button>}
        </div>

        {isLoading ? (
          <div className="flex justify-center p-10">
            <Spinner size="sm" />
          </div>
        ) : isError ? (
          <p className="p-8 text-center text-sm text-danger-600">Could not load the warehouses.</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-text-muted">
            {filtered ? 'No warehouse matches these filters.' : `No warehouses yet.${canEdit ? ' Add your first one to list it here.' : ''}`}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className={HEAD}>Name</th>
                  <th className={HEAD}>Address</th>
                  <th className={HEAD}>City</th>
                  <th className={HEAD}>State / province</th>
                  <th className={HEAD}>Country</th>
                  {canEdit && <th className={`${HEAD} text-right`}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((warehouse) => (
                  <tr key={warehouse.id} className="border-b border-border last:border-0">
                    <td className={`${CELL} font-medium text-text-primary`}>{warehouse.name}</td>
                    <td className={CELL}>
                      {warehouse.address}
                      {warehouse.postalCode && <span className="block text-xs text-text-muted">{warehouse.postalCode}</span>}
                    </td>
                    <td className={CELL}>{warehouse.city}</td>
                    <td className={CELL}>{warehouse.province ?? '-'}</td>
                    <td className={CELL}>{countryNames.get(warehouse.country) ?? warehouse.country}</td>
                    {canEdit && (
                      <td className={`${CELL} text-right`}>
                        <RowActionsMenu
                          label={warehouse.name}
                          items={[
                            { key: 'edit', label: 'Edit', onSelect: () => setEditing(warehouse) },
                            { key: 'delete', label: 'Delete', tone: 'danger', onSelect: () => setDeleting(warehouse) },
                          ]}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.totalRecords > 0 && (
          <PaginationFooter page={data.page} pageSize={data.limit} totalItems={data.totalRecords} totalPages={data.totalPages} onPageChange={setPage} itemLabel="warehouses" />
        )}
      </div>

      <WarehouseFormModal
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={(saved, created) => {
          success(created ? `${saved.name} added` : `${saved.name} updated`)
          setEditing(null)
        }}
      />

      <ConfirmDialog
        isOpen={deleting !== null}
        title={`Delete ${deleting?.name ?? 'warehouse'}`}
        confirmLabel="Delete"
        tone="danger"
        busy={removing}
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleting(null)}
      >
        This removes the warehouse from your list. You can&apos;t undo it.
      </ConfirmDialog>
    </div>
  )
}
