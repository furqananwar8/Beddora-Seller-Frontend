import { useGetMyPermissionsQuery } from '@/services/api/permissions.api'

export function useFetchPermissions(accountId?: string) {
  const query = useGetMyPermissionsQuery(accountId ? { accountId } : undefined)
  return query
}
