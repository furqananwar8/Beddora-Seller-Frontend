import { useApiFeedback } from '@/hooks/useApiFeedback'
import { useCreateProductManagerMutation, useUpdateProductManagerMutation, type ProductManager } from '@/services/api/productManagers.api'
import type { ProductManagerFormValues } from './productManagerSchema'

/**
 * Saves a product manager with toast feedback: adds one, or updates `existing`.
 * Resolves to the saved manager, or null when saving failed.
 */
export function useSaveProductManager(existing?: ProductManager) {
  const { success, failure } = useApiFeedback()
  const [create] = useCreateProductManagerMutation()
  const [update] = useUpdateProductManagerMutation()

  return async (values: ProductManagerFormValues): Promise<ProductManager | null> => {
    try {
      const saved = existing ? await update({ id: existing.id, body: values }).unwrap() : await create(values).unwrap()
      success(existing ? 'Product manager updated' : 'Product manager added')
      return saved
    } catch (error) {
      failure(error, existing ? 'Could not update the product manager' : 'Could not add the product manager')
      return null
    }
  }
}
