import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { UserPermissions } from '@/services/api/permissions.api'

/**
 * Permissions slice
 * 
 * Manages user permissions and roles
 */

interface PermissionsState {
  permissions: Record<string, string>
  roles: string[]
  isLoading: boolean
}

const initialState: PermissionsState = {
  permissions: {},
  roles: [],
  isLoading: false,
}

const permissionsSlice = createSlice({
  name: 'permissions',
  initialState,
  reducers: {
    setPermissions: (state, action: PayloadAction<UserPermissions>) => {
      state.permissions = action.payload.permissions
      state.roles = action.payload.roles
    },
    clearPermissions: (state) => {
      state.permissions = {}
      state.roles = []
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
  },
})

export const {
  setPermissions,
  clearPermissions,
  setLoading: setPermissionsLoading,
} = permissionsSlice.actions
export default permissionsSlice.reducer

/**
 * Helper function to check if user has permission
 */
export function hasPermission(
  permissions: Record<string, string>,
  resource: string,
  action: string
): boolean {
  const key = `${resource}.${action}`
  return key in permissions && permissions[key] !== 'none'
}
