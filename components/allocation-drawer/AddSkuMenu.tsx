import React, { useCallback, useRef, useState } from 'react'
import { ProductInventoryItem, useGetProductInventoryQuery } from '@/services/api/inventoryPlanner.api'
import { FloatingMenu } from '@/features/inventory/shipments/ShipmentParts'
import { Spinner } from '@/design-system/loaders'
import { useDebounce } from '@/hooks/useDebounce'
import { DrawerButton } from './drawerUi'

/** Results listed at once; the search narrows the rest. */
const MAX_RESULTS = 20

/**
 * "+ Add SKU" for the allocation drawer, like "+ Add product" on a shipment: searches the planner's products
 * (debounced) and adds the picked one. Products already in the drawer are left out.
 */
export const AddSkuMenu: React.FC<{ excludeIds: string[]; onAdd: (item: ProductInventoryItem) => void }> = ({ excludeIds, onAdd }) => {
  const anchorRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const search = useDebounce(query.trim(), 300)
  const { data: products = [], isFetching } = useGetProductInventoryQuery({ search: search || undefined, showOos: true }, { skip: !open })

  const close = useCallback(() => setOpen(false), [])
  const addable = products.filter((p) => !excludeIds.includes(p.id))
  const shown = addable.slice(0, MAX_RESULTS)

  return (
    <div ref={anchorRef}>
      <DrawerButton aria-expanded={open} onClick={() => setOpen((o) => !o)} className="h-9 px-3.5">
        + Add SKU
      </DrawerButton>
      <FloatingMenu anchorRef={anchorRef} open={open} onClose={close} width={360}>
        <div className="px-3 pb-2 pt-1">
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, SKU or ASIN"
            aria-label="Search products to add"
            className="h-9 w-full !rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
        </div>
        <div className="max-h-72 overflow-y-auto">
          {isFetching ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-600">
              <Spinner /> Searching…
            </div>
          ) : shown.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-slate-600">No other products match.</div>
          ) : (
            shown.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onAdd(p)
                  close()
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-slate-900">{p.description}</div>
                  <div className="font-mono text-xs text-slate-600">{p.sku}</div>
                </div>
              </button>
            ))
          )}
        </div>
        {!isFetching && addable.length > MAX_RESULTS && (
          <div className="border-t border-slate-200 px-3 py-2 text-xs text-slate-600">
            Showing {MAX_RESULTS} of {addable.length}. Search to narrow the list.
          </div>
        )}
      </FloatingMenu>
    </div>
  )
}
