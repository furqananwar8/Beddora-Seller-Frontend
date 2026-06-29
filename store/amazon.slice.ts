import { createSlice, PayloadAction } from '@reduxjs/toolkit'

/**
 * Amazon slice
 * 
 * Manages Amazon sync state and logs
 */

export type SyncType = 'orders' | 'fees' | 'ppc' | 'inventory' | 'listings' | 'refunds'

export interface SyncLog {
  id: string
  userId: string
  amazonAccountId: string
  syncType: SyncType
  status: 'success' | 'failed' | 'partial'
  recordsSynced: number
  recordsFailed: number
  errorMessage?: string
  metadata?: Record<string, any>
  startedAt: string
  completedAt?: string
  amazonAccount?: {
    id: string
    marketplace: string
    sellerId: string
  }
}

interface AmazonState {
  // Sync status per type
  syncStatus: Record<SyncType, {
    isSyncing: boolean
    lastSync?: string
    error?: string
  }>
  
  // Sync logs
  syncLogs: SyncLog[]
  isLoadingLogs: boolean
  
  // Active sync operations
  activeSyncs: Record<string, SyncType> // accountId -> syncType
}

const initialState: AmazonState = {
  syncStatus: {
    orders: { isSyncing: false },
    fees: { isSyncing: false },
    ppc: { isSyncing: false },
    inventory: { isSyncing: false },
    listings: { isSyncing: false },
    refunds: { isSyncing: false },
  },
  syncLogs: [],
  isLoadingLogs: false,
  activeSyncs: {},
}

const amazonSlice = createSlice({
  name: 'amazon',
  initialState,
  reducers: {
    // Set sync status
    setSyncStatus: (
      state,
      action: PayloadAction<{
        type: SyncType
        isSyncing: boolean
        lastSync?: string
        error?: string
      }>
    ) => {
      state.syncStatus[action.payload.type] = {
        isSyncing: action.payload.isSyncing,
        lastSync: action.payload.lastSync,
        error: action.payload.error,
      }
    },

    // Set active sync
    setActiveSync: (
      state,
      action: PayloadAction<{
        accountId: string
        type: SyncType | null
      }>
    ) => {
      if (action.payload.type === null) {
        delete state.activeSyncs[action.payload.accountId]
      } else {
        state.activeSyncs[action.payload.accountId] = action.payload.type
      }
    },

    // Set sync logs
    setSyncLogs: (state, action: PayloadAction<SyncLog[]>) => {
      state.syncLogs = action.payload
    },

    // Add sync log
    addSyncLog: (state, action: PayloadAction<SyncLog>) => {
      state.syncLogs.unshift(action.payload)
      // Keep only last 100 logs
      if (state.syncLogs.length > 100) {
        state.syncLogs = state.syncLogs.slice(0, 100)
      }
    },

    // Set loading state
    setLoadingLogs: (state, action: PayloadAction<boolean>) => {
      state.isLoadingLogs = action.payload
    },

    // Clear errors
    clearSyncError: (state, action: PayloadAction<SyncType>) => {
      state.syncStatus[action.payload].error = undefined
    },
  },
})

export const {
  setSyncStatus,
  setActiveSync,
  setSyncLogs,
  addSyncLog,
  setLoadingLogs,
  clearSyncError,
} = amazonSlice.actions

export default amazonSlice.reducer
