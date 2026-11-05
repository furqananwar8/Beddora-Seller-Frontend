import { createSlice, PayloadAction } from '@reduxjs/toolkit'

/**
 * Authentication slice
 * 
 * Manages authentication state (user, account). The session itself is an HttpOnly cookie.
 */

interface User {
  id: string
  email: string
  name: string | null
  isVerified: boolean
  roles: string[]
}

interface AuthState {
  user: User | null
  accountId: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

const initialState: AuthState = {
  user: null,
  accountId: null,
  isAuthenticated: false,
  isLoading: true, // start loading until refresh/auth check completes
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        user: User
        accountId?: string
      }>
    ) => {
      state.user = action.payload.user
      state.accountId = action.payload.accountId || null
      state.isAuthenticated = true
    },
    setAccountId: (state, action: PayloadAction<string | null>) => {
      state.accountId = action.payload
    },
    clearCredentials: (state) => {
      state.user = null
      state.accountId = null
      state.isAuthenticated = false
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    initializeAuth: (state) => {
      // No-op: the session lives in an HttpOnly cookie; the user is loaded from /auth/me
      return state
    },
  },
})

export const {
  setCredentials,
  setAccountId,
  clearCredentials,
  setLoading,
  initializeAuth,
} = authSlice.actions
export default authSlice.reducer
