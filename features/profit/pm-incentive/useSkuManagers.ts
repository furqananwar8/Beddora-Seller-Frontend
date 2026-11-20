import { useCallback, useMemo } from 'react'
import { skusOn, useGetProductManagersQuery } from '@/services/api/productManagers.api'

/**
 * Who manages each Amazon SKU, from the managers set up on Profit > PM Incentive.
 * Returns `undefined` until the managers have loaded (or when the user may not read them), so callers can hide the column.
 */
export function useSkuManagers(): ((sku: string) => string[]) | undefined {
  const { data: managers } = useGetProductManagersQuery()

  const namesBySku = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const manager of managers ?? []) {
      for (const sku of skusOn(manager, 'amazon')) map.set(sku, [...(map.get(sku) ?? []), manager.name])
    }
    return map
  }, [managers])

  const managersOf = useCallback((sku: string) => namesBySku.get(sku) ?? [], [namesBySku])
  return managers ? managersOf : undefined
}
