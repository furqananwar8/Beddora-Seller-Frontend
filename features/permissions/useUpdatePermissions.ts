import { useUpdateUserPermissionsMutation } from '@/services/api/permissions.api'

export function useUpdatePermissions() {
  const [mutate, state] = useUpdateUserPermissionsMutation()
  const submit = (userId: string, data: Parameters<typeof mutate>[0]['data']) =>
    mutate({ userId, data }).unwrap()
  return { submit, ...state }
}
