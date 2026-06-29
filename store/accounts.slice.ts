import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Account, AmazonAccount } from '@/services/api/accounts.api'

/**
 * Accounts slice
 * 
 * Manages user accounts and active account state
 * Supports both internal accounts and Amazon accounts
 * 
 * State Structure:
 * - accounts: Internal accounts (Account model)
 * - amazonAccounts: Linked Amazon Seller Central accounts
 * - activeAccount: Currently selected internal account
 * - activeAmazonAccountId: Currently selected Amazon account ID
 */

interface AccountsState {
  // Internal accounts
  accounts: Account[]
  activeAccount: Account | null
  
  // Amazon accounts
  amazonAccounts: AmazonAccount[]
  activeAmazonAccountId: string | null
  
  // Loading states
  isLoading: boolean
  isAmazonLoading: boolean
}

const initialState: AccountsState = {
  accounts: [],
  activeAccount: null,
  amazonAccounts: [],
  activeAmazonAccountId: null,
  isLoading: false,
  isAmazonLoading: false,
}

const accountsSlice = createSlice({
  name: 'accounts',
  initialState,
  reducers: {
    // Internal account actions
    setAccounts: (state, action: PayloadAction<Account[]>) => {
      state.accounts = action.payload
      // Set active account to default if exists
      const defaultAccount = action.payload.find((acc) => acc.isDefault)
      if (defaultAccount) {
        state.activeAccount = defaultAccount
      }
    },
    setActiveAccount: (state, action: PayloadAction<Account | null>) => {
      state.activeAccount = action.payload
    },
    addAccount: (state, action: PayloadAction<Account>) => {
      state.accounts.push(action.payload)
      if (action.payload.isDefault) {
        state.activeAccount = action.payload
      }
    },
    updateAccount: (state, action: PayloadAction<Account>) => {
      const index = state.accounts.findIndex((acc) => acc.id === action.payload.id)
      if (index !== -1) {
        state.accounts[index] = action.payload
        if (state.activeAccount?.id === action.payload.id) {
          state.activeAccount = action.payload
        }
      }
    },
    removeAccount: (state, action: PayloadAction<string>) => {
      state.accounts = state.accounts.filter((acc) => acc.id !== action.payload)
      if (state.activeAccount?.id === action.payload) {
        state.activeAccount = state.accounts[0] || null
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },

    // Amazon account actions
    setAmazonAccounts: (state, action: PayloadAction<AmazonAccount[]>) => {
      state.amazonAccounts = action.payload
      // Set active account to first active account if none selected
      if (!state.activeAmazonAccountId && action.payload.length > 0) {
        const activeAccount = action.payload.find((acc) => acc.isActive)
        if (activeAccount) {
          state.activeAmazonAccountId = activeAccount.id
        }
      }
    },
    setActiveAmazonAccount: (state, action: PayloadAction<string | null>) => {
      state.activeAmazonAccountId = action.payload
    },
    addAmazonAccount: (state, action: PayloadAction<AmazonAccount>) => {
      state.amazonAccounts.push(action.payload)
      // Auto-select if it's the first account
      if (state.amazonAccounts.length === 1) {
        state.activeAmazonAccountId = action.payload.id
      }
    },
    updateAmazonAccount: (state, action: PayloadAction<AmazonAccount>) => {
      const index = state.amazonAccounts.findIndex((acc) => acc.id === action.payload.id)
      if (index !== -1) {
        state.amazonAccounts[index] = action.payload
        // If the active account was updated and is now inactive, clear selection
        if (state.activeAmazonAccountId === action.payload.id && !action.payload.isActive) {
          state.activeAmazonAccountId = null
        }
      }
    },
    removeAmazonAccount: (state, action: PayloadAction<string>) => {
      state.amazonAccounts = state.amazonAccounts.filter((acc) => acc.id !== action.payload)
      if (state.activeAmazonAccountId === action.payload) {
        // Select another active account if available
        const activeAccount = state.amazonAccounts.find((acc) => acc.isActive)
        state.activeAmazonAccountId = activeAccount?.id || null
      }
    },
    setAmazonLoading: (state, action: PayloadAction<boolean>) => {
      state.isAmazonLoading = action.payload
    },
  },
})

export const {
  // Internal account actions
  setAccounts,
  setActiveAccount,
  addAccount,
  updateAccount,
  removeAccount,
  setLoading: setAccountsLoading,
  
  // Amazon account actions
  setAmazonAccounts,
  setActiveAmazonAccount,
  addAmazonAccount,
  updateAmazonAccount,
  removeAmazonAccount,
  setAmazonLoading,
} = accountsSlice.actions

export default accountsSlice.reducer
