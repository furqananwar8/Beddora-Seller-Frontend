import { createSlice, PayloadAction } from '@reduxjs/toolkit'

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
  // Advertising OAuth session
  sessionId: string | null
  profileId: string | null
  region: string | null
  email: string | null
  name: string | null
  isConnected: boolean
  isLoadingAuth: boolean

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
  activeSyncs: Record<string, SyncType>
}

const initialState: AmazonState = {
  sessionId: null,
  profileId: null,
  region: null,
  email: null,
  name: null,
  isConnected: false,
  isLoadingAuth: false,

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
    // ── Advertising OAuth ──────────────────────────────
    setAmazonSession(
      state,
      action: PayloadAction<{
        sessionId?: string | null
        profileId?: string | null
        region?: string | null
        email?: string | null
        name?: string | null
        isConnected?: boolean
      }>,
    ) {
      const { sessionId, profileId, region, email, name, isConnected } = action.payload
      if (sessionId !== undefined) state.sessionId = sessionId
      if (profileId !== undefined) state.profileId = profileId
      if (region !== undefined) state.region = region
      if (email !== undefined) state.email = email
      if (name !== undefined) state.name = name
      if (isConnected !== undefined) state.isConnected = isConnected
      state.isLoadingAuth = false
    },

    clearAmazonSession(state) {
      state.sessionId = null
      state.profileId = null
      state.region = null
      state.email = null
      state.name = null
      state.isConnected = false
      state.isLoadingAuth = false
    },

    setAmazonAuthLoading(state, action: PayloadAction<boolean>) {
      state.isLoadingAuth = action.payload
    },

    // ── Sync (existing) ────────────────────────────────
    setSyncStatus: (
      state,
      action: PayloadAction<{
        type: SyncType
        isSyncing: boolean
        lastSync?: string
        error?: string
      }>,
    ) => {
      state.syncStatus[action.payload.type] = {
        isSyncing: action.payload.isSyncing,
        lastSync: action.payload.lastSync,
        error: action.payload.error,
      }
    },

    setActiveSync: (
      state,
      action: PayloadAction<{
        accountId: string
        type: SyncType | null
      }>,
    ) => {
      if (action.payload.type === null) {
        delete state.activeSyncs[action.payload.accountId]
      } else {
        state.activeSyncs[action.payload.accountId] = action.payload.type
      }
    },

    setSyncLogs: (state, action: PayloadAction<SyncLog[]>) => {
      state.syncLogs = action.payload
    },

    addSyncLog: (state, action: PayloadAction<SyncLog>) => {
      state.syncLogs.unshift(action.payload)
      if (state.syncLogs.length > 100) {
        state.syncLogs = state.syncLogs.slice(0, 100)
      }
    },

    setLoadingLogs: (state, action: PayloadAction<boolean>) => {
      state.isLoadingLogs = action.payload
    },

    clearSyncError: (state, action: PayloadAction<SyncType>) => {
      state.syncStatus[action.payload].error = undefined
    },
  },
})

export const {
  setAmazonSession,
  clearAmazonSession,
  setAmazonAuthLoading,
  setSyncStatus,
  setActiveSync,
  setSyncLogs,
  addSyncLog,
  setLoadingLogs,
  clearSyncError,
} = amazonSlice.actions

export default amazonSlice.reducer