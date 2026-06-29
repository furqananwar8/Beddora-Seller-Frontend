import { createSlice, PayloadAction } from '@reduxjs/toolkit'

/**
 * Authentication slice
 * 
 * Manages authentication state (user, tokens, account)
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
  accessToken: string | null
  refreshToken: string | null
  accountId: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
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
        accessToken: string
        refreshToken?: string
        accountId?: string
      }>
    ) => {
      state.user = action.payload.user
      state.accessToken = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken || null
      state.accountId = action.payload.accountId || null
      state.isAuthenticated = true
    },
    updateAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload
      // If we have a token, we're authenticated (even if user data hasn't loaded yet)
      if (action.payload) {
        state.isAuthenticated = true
      }
    },
    setAccountId: (state, action: PayloadAction<string | null>) => {
      state.accountId = action.payload
    },
    clearCredentials: (state) => {
      state.user = null
      state.accessToken = null
      state.refreshToken = null
      state.accountId = null
      state.isAuthenticated = false
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    initializeAuth: (state) => {
      // No-op: tokens are kept in memory; refresh via HttpOnly cookie
      return state
    },
  },
})

export const {
  setCredentials,
  updateAccessToken,
  setAccountId,
  clearCredentials,
  setLoading,
  initializeAuth,
} = authSlice.actions
export default authSlice.reducer
