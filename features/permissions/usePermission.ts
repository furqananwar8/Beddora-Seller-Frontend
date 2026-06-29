import { useAppSelector } from '@/store/hooks'
import { hasPermission } from '@/store/permissions.slice'

/**
 * Hook to check if user has permission
 * 
 * Usage:
 * const canReadProfit = usePermission('profit', 'read')
 */
export function usePermission(resource: string, action: string): boolean {
  const permissions = useAppSelector((state) => state.permissions.permissions)
  return hasPermission(permissions, resource, action)
}
