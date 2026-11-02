'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { NumericInput } from '@/components/form-field/NumericInput'
import { SearchableSelect } from '@/components/searchable-select/SearchableSelect'
import { ProductPhoto } from '@/features/procurement/shared/ProductPhoto'
import { formatWeight } from '@/features/procurement/shared/units'
import { useSearchShippingProductsQuery } from '@/services/api/shipping.api'
import { useDebounce } from '@/utils/debounce'
import { SectionCard } from '../shared/Card'
import { numberField } from '../shared/fieldStyles'
import type { ShippingProduct } from '../types'
import { UNITS, type DraftAction, type PickedProduct, type UnitSystem } from './shipmentDraft'
import type { FieldErrors } from './shipmentRules'

interface ProductsCardProps {
  products: PickedProduct[]
  units: UnitSystem
  errors: FieldErrors
  dispatch: React.Dispatch<DraftAction>
}

const HEAD = 'px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-text-muted'
const CELL = 'px-3 py-2 align-middle text-sm'

/** Product master search, fetched only while the dropdown is open. */
function useProductSearch() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search.trim(), 250)
  const { data = [], isFetching } = useSearchShippingProductsQuery({ search: debounced }, { skip: !open })
  return { search, setSearch, setOpen, options: data, isFetching }
}

/** The products in the parcel: picking one fills the package and adds its customs line. */
export const ProductsCard: React.FC<ProductsCardProps> = ({ products, units, errors, dispatch }) => {
  const lookup = useProductSearch()
  const picked = new Set(products.map((item) => item.product.id))

  return (
    <SectionCard title="Products" subtitle="pick from our catalogue">
      <SearchableSelect<ShippingProduct>
        id="shipping-product-search"
        ariaLabel="Add a product"
        value={null}
        onChange={(product) => dispatch({ type: 'addProduct', product })}
        options={lookup.options}
        getKey={(product) => product.id}
        getLabel={(product) => `${product.sku ?? ''} ${product.variantName ?? product.name}`.trim()}
        renderOption={(product) => (
          <span className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate font-mono text-xs">{product.sku ?? '—'}</span>
            <span className="min-w-0 flex-1 truncate">{product.variantName ?? product.name}</span>
            {picked.has(product.id) && <span className="text-xs text-text-muted">Added</span>}
          </span>
        )}
        search={lookup.search}
        onSearchChange={lookup.setSearch}
        onOpenChange={lookup.setOpen}
        loading={lookup.isFetching}
        placeholder="Search by SKU, name or UPC…"
        searchPlaceholder="SKU, name or UPC"
        emptyText="No product matches."
        error={errors.products}
      />
      {errors.products && <p className="mt-1 text-xs text-danger-600">{errors.products}</p>}

      {products.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className={HEAD} aria-label="Photo" />
                <th className={HEAD}>Product</th>
                <th className={HEAD}>SKU</th>
                <th className={HEAD}>Qty</th>
                <th className={HEAD}>Unit wt</th>
                <th className={HEAD} aria-label="Remove" />
              </tr>
            </thead>
            <tbody>
              {products.map(({ product, quantity }) => {
                const error = errors[`qty.${product.id}`]
                return (
                  <tr key={product.id} className="border-b border-border last:border-0">
                    <td className={CELL}>
                      <ProductPhoto productId={product.id} hasPhoto={product.hasPhoto} version="" alt={product.name} basePath="/shipping/products" />
                    </td>
                    <td className={CELL}>
                      <span className="font-medium text-text-primary">{product.name}</span>
                      {product.variantName && <span className="block text-xs text-text-muted">Variation · {product.variantName}</span>}
                    </td>
                    <td className={`${CELL} font-mono text-xs`}>{product.sku ?? '—'}</td>
                    <td className={`${CELL} w-24`}>
                      <NumericInput
                        aria-label={`Quantity of ${product.name}`}
                        value={quantity}
                        onChange={(event) => dispatch({ type: 'setQuantity', productId: product.id, quantity: event.target.value })}
                        className={numberField(error)}
                      />
                      {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
                    </td>
                    <td className={`${CELL} whitespace-nowrap`}>{formatWeight(product.weight, UNITS[units].weight)}</td>
                    <td className={`${CELL} text-right`}>
                      <button
                        type="button"
                        aria-label={`Remove ${product.name}`}
                        onClick={() => dispatch({ type: 'removeProduct', productId: product.id })}
                        className="rounded-md p-1 text-text-muted hover:bg-secondary-100 hover:text-danger-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}
