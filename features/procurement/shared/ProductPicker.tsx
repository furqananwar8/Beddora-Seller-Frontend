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

/** SKU, name and tag: one product option in every procurement product dropdown. */
const ProductOption: React.FC<{ product: PoProduct; note?: React.ReactNode }> = ({ product, note }) => (
  <span className="flex items-center gap-3">
    <span className="w-28 shrink-0 truncate font-mono text-xs">{product.ref}</span>
    <span className="min-w-0 flex-1 truncate">{productLabel(product)}</span>
    <ProductTagBadge tag={product.tag} />
    {note && <span className="w-12 shrink-0 text-right text-xs text-text-muted">{note}</span>}
  </span>
)

/** Server-searched orderable products, fetched only while the dropdown is open. */
function useProductOptions() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 250)
  const { data = [], isFetching } = useGetPoProductOptionsQuery({ search: debounced, limit: 30 }, { skip: !open })
  return { search, setSearch, setOpen, options: data, isFetching }
}

interface ProductSelectProps {
  id?: string
  value: Pick<PoProduct, 'id' | 'ref' | 'name' | 'variantName'> | null
  onChange: (product: PoProduct) => void
  disabled?: boolean
  error?: string
  placeholder?: string
}

/** Pick one product (price analysis): the same search and options as the PO picker. */
export const ProductSelect: React.FC<ProductSelectProps> = ({ id, value, onChange, disabled, error, placeholder = 'Search SKU or product name' }) => {
  const lookup = useProductOptions()
  return (
    <SearchableSelect<PoProduct>
      id={id}
      value={value as PoProduct | null}
      onChange={onChange}
      options={lookup.options}
      getKey={(product) => product.id}
      getLabel={(product) => `${product.ref} · ${productLabel(product)}`}
      renderOption={(product) => <ProductOption product={product} />}
      search={lookup.search}
      onSearchChange={lookup.setSearch}
      onOpenChange={lookup.setOpen}
      loading={lookup.isFetching}
      placeholder={placeholder}
      searchPlaceholder="SKU or product name..."
      emptyText="No product matches."
      error={error}
      disabled={disabled}
    />
  )
}

/**
 * Type SKU or name, tick products to add them. Lists what can be ordered: variations and masters
 * without variations, each with its SKU and tag. Shared by every procurement product picker.
 */
export const ProductPicker: React.FC<ProductPickerProps> = ({ id, selected, onChange, canCreate, disabled, error, placeholder = 'Search SKU or name to add products' }) => {
  const lookup = useProductOptions()
  const [creating, setCreating] = useState(false)
  const picked = new Set(selected.map((product) => product.id))

  return (
    <>
      <SearchableSelect<PoProduct>
        id={id}
        multiple
        value={selected}
        onChange={onChange}
        options={lookup.options}
        getKey={(product) => product.id}
        getLabel={(product) => `${product.ref} ${productLabel(product)}`}
        renderValue={() => placeholder}
        renderOption={(product) => <ProductOption product={product} note={picked.has(product.id) ? 'Added' : undefined} />}
        search={lookup.search}
        onSearchChange={lookup.setSearch}
        onOpenChange={lookup.setOpen}
        loading={lookup.isFetching}
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
