'use client'

import React, { useState } from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { WarehouseFormModal } from '@/features/settings/warehouses/WarehouseFormModal'
import { useAppAbility } from '@/hooks/useAppAbility'
import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useGetPoWarehousesQuery, type PoWarehouse } from '@/services/api/procurement.api'

/** A warehouse's delivery address on one line: street, city, province, postal code, country. */
export const warehouseAddress = (warehouse: Pick<PoWarehouse, 'address' | 'city' | 'province' | 'postalCode' | 'country'>): string =>
  [warehouse.address, warehouse.city, [warehouse.province, warehouse.postalCode].filter(Boolean).join(' '), warehouse.country].filter(Boolean).join(', ')

const WarehouseOption: React.FC<{ warehouse: PoWarehouse }> = ({ warehouse }) => (
  <span className="block min-w-0">
    <span className="block truncate font-medium">{warehouse.name}</span>
    <span className="block truncate text-xs text-text-muted">{warehouseAddress(warehouse)}</span>
  </span>
)

interface WarehouseSelectProps {
  id?: string
  /** The picked warehouse's id, or null for none. */
  value: number | null
  onChange: (warehouse: PoWarehouse) => void
  error?: string
  disabled?: boolean
}

/**
 * The delivery-warehouse dropdown: search the organisation's warehouses, or add one right here with "+ Add new warehouse"
 * (offered to those who may edit Settings > Warehouses). A warehouse added here is picked as soon as it is saved.
 */
export const WarehouseSelect: React.FC<WarehouseSelectProps> = ({ id, value, onChange, error, disabled }) => {
  const { data: warehouses = [], isFetching } = useGetPoWarehousesQuery()
  const canCreate = useAppAbility().can('write', 'settings:warehouses')
  const { success } = useApiFeedback()
  const [creating, setCreating] = useState(false)
  // Shown at once; the list refetches in the background and then holds it too
  const [added, setAdded] = useState<PoWarehouse | null>(null)

  const options = added && !warehouses.some((warehouse) => warehouse.id === added.id) ? [added, ...warehouses] : warehouses
  const selected = options.find((warehouse) => warehouse.id === value) ?? null

  return (
    <>
      <SearchableSelect<PoWarehouse>
        id={id}
        value={selected}
        onChange={onChange}
        options={options}
        getKey={(warehouse) => warehouse.id}
        getLabel={(warehouse) => `${warehouse.name} · ${warehouse.city}${warehouse.province ? `, ${warehouse.province}` : ''}`}
        renderOption={(warehouse) => <WarehouseOption warehouse={warehouse} />}
        searchable
        loading={isFetching}
        placeholder="Select a warehouse"
        searchPlaceholder="Warehouse name or address..."
        emptyText="No warehouse matches."
        error={error}
        disabled={disabled}
        footer={
          canCreate
            ? (close) => (
                <button
                  type="button"
                  onClick={() => {
                    close()
                    setCreating(true)
                  }}
                  className="block w-full rounded-md px-2 pb-1 pt-2 text-left text-sm font-medium text-primary-600 hover:underline"
                >
                  + Add new warehouse
                </button>
              )
            : undefined
        }
      />
      {canCreate && (
        <WarehouseFormModal
          editing={creating ? 'new' : null}
          onClose={() => setCreating(false)}
          onSaved={(saved) => {
            const warehouse: PoWarehouse = { id: saved.id, name: saved.name, address: saved.address, city: saved.city, province: saved.province, postalCode: saved.postalCode, country: saved.country }
            setAdded(warehouse)
            onChange(warehouse)
            setCreating(false)
            success(`Warehouse “${saved.name}” added`)
          }}
        />
      )}
    </>
  )
}
