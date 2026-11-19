'use client'

import { useRealtime } from '@/components/realtime/RealtimeProvider'
import { procurementApi, type ProductImport } from '@/services/api/procurement.api'
import { useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/ui.slice'

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/** How the import ended, in words for a toast. */
export function importOutcome(item: Pick<ProductImport, 'status' | 'createdProducts' | 'failedProducts' | 'error'>, hint = ''): { message: string; type: 'success' | 'warning' | 'error' } {
  if (item.status === 'FAILED') return { message: item.error ?? 'The product import failed. Upload the file again.', type: 'error' }
  if (item.failedProducts === 0) return { message: `Product import finished: ${plural(item.createdProducts, 'product')} created.`, type: 'success' }
  if (item.createdProducts === 0) return { message: `Product import finished, but none of the ${plural(item.failedProducts, 'product')} could be created.${hint}`, type: 'error' }
  return { message: `Product import finished: ${item.createdProducts} created, ${item.failedProducts} skipped.${hint}`, type: 'warning' }
}

/** Added to the toast, which is seen away from the import window. */
const SEE_WHY = ' Open Import from Excel on the Products page to see why.'

/**
 * Follows a background product import wherever the user is in the app: keeps the progress shown by the import screen
 * up to date and toasts the outcome to whoever started it (the server addresses `import.finished` to them only).
 * Rides the realtime stream, so it must be rendered inside `RealtimeProvider`.
 */
export const ProductImportEventListener: React.FC = () => {
  const dispatch = useAppDispatch()

  useRealtime('procurement.product-import', (message) => {
    const data = message.data as unknown as Partial<ProductImport> & { id: number }
    if (message.type === 'import.finished') dispatch(addNotification(importOutcome(data as ProductImport, SEE_WHY)))

    // Progress only carries counters: merge them into the cached import. An import this screen has not loaded yet is fetched instead.
    let patched = false
    dispatch(
      procurementApi.util.updateQueryData('getProductImportCurrent', undefined, (draft) => {
        if (draft?.id !== data.id) return
        Object.assign(draft, data)
        patched = true
      })
    )
    if (!patched || data.active === false) dispatch(procurementApi.util.invalidateTags(['ProcurementProductImports']))
  })

  return null
}
