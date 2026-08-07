import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface CaslRule {
  action: string
  subject: string
}

interface PermissionsState {
  rules: CaslRule[]
  roles: string[]
  isLoading: boolean
  isLoaded: boolean // <-- NEW
  permissions: any
}

const initialState: PermissionsState = {
  rules: [],
  roles: [],
  isLoading: false,
  isLoaded: false,
  permissions: []
}

const permissionsSlice = createSlice({
  name: 'permissions',
  initialState,
  reducers: {
    setPermissions: (state, action: PayloadAction<{ data?: CaslRule[]; rules?: CaslRule[]; roles?: string[] } | CaslRule[] | Record<string, string>>) => {
      const payload = action.payload as any
      state.isLoaded = true

      if (Array.isArray(payload) && payload.length > 0 && payload[0].action) {
        state.rules = payload
      } else if (payload?.data && Array.isArray(payload.data)) {
        state.rules = payload.data
      } else if (payload?.rules && Array.isArray(payload.rules)) {
        state.rules = payload.rules
      } else {
        state.rules = []
      }

      if (payload?.roles && Array.isArray(payload.roles)) {
        state.roles = payload.roles
      }
    },
    clearPermissions: (state) => {
      state.rules = []
      state.roles = []
      state.isLoaded = false
    },
    setPermissionsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
  },
})

export const { setPermissions, clearPermissions, setPermissionsLoading } =
  permissionsSlice.actions
export default permissionsSlice.reducer

/**
 * Backward-compat helper — creates a temporary Ability to check.
 * Prefer using useAppAbility() or <Can> in components.
 */
export function hasPermission(
  rules: CaslRule[],
  subject: string,
  action: string = 'read'
): boolean {
  // Lazy import so we don't bundle @casl/ability where not needed
  const { Ability } = require('@casl/ability')
  return new Ability(rules).can(action, subject)
}