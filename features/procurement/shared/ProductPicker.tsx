'use client'

import React, { useState } from 'react'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { useGetPoProductOptionsQuery, type PoProduct } from '@/services/api/procurement.api'
import { useDebounce } from '@/utils/debounce'
import { QuickProductModal } from '../products/QuickProductModal'
import { ProductTagBadge } from './ProductTagBadge'

interface ProductPickerProps {
  id?: string
  /** Products already on the form; they show as ticked. */
  selected: PoProduct[]
  onChange: (products: PoProduct[]) => void
  /** Offers "+ Add new product" (quick create). */
  canCreate?: boolean
  disabled?: boolean
  error?: string
  placeholder?: string
}

export const productLabel = (product: Pick<PoProduct, 'name' | 'variantName'>): string => product.variantName ?? product.name

/**
 * Type SKU or name, tick products to add them. Lists what can be ordered: variations and masters
 * without variations, each with its SKU and tag. Shared by every procurement product picker.
 */
export const ProductPicker: React.FC<ProductPickerProps> = ({ id, selected, onChange, canCreate, disabled, error, placeholder = 'Search SKU or name to add products' }) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const debounced = useDebounce(search, 250)
  const { data = [], isFetching } = useGetPoProductOptionsQuery({ search: debounced, limit: 30 }, { skip: !open })
  const picked = new Set(selected.map((product) => product.id))

  return (
    <>
      <SearchableSelect<PoProduct>
        id={id}
        multiple
        value={selected}
        onChange={onChange}
        options={data}
        getKey={(product) => product.id}
        getLabel={(product) => `${product.sku} ${productLabel(product)}`}
        renderValue={() => placeholder}
        renderOption={(product) => (
          <span className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate font-mono text-xs">{product.sku}</span>
            <span className="min-w-0 flex-1 truncate">{productLabel(product)}</span>
            <ProductTagBadge tag={product.tag} />
            {picked.has(product.id) && <span className="w-12 shrink-0 text-right text-xs text-text-muted">Added</span>}
          </span>
        )}
        search={search}
        onSearchChange={setSearch}
        onOpenChange={setOpen}
        loading={isFetching}
        placeholder={placeholder}
        searchPlaceholder="SKU or product name..."
        emptyText="No product matches."
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
                  + Add new product
                </button>
              )
            : undefined
        }
      />
      {canCreate && <QuickProductModal isOpen={creating} onClose={() => setCreating(false)} onCreated={(product) => onChange([...selected, product])} />}
    </>
  )
}
