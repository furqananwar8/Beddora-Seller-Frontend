import { createSlice, PayloadAction } from '@reduxjs/toolkit'

/**
 * Manual Import slice
 * 
 * Manages state for manual data import operations
 */

export type ImportType = 'orders' | 'fees' | 'ppc' | 'inventory' | 'listings' | 'refunds'

export type StagingStatus = 'pending' | 'approved' | 'rejected' | 'finalized'

export interface StagingRow {
  id: string
  userId: string
  amazonAccountId: string
  marketplaceId: string
  rawData: Record<string, any>
  validated: boolean
  errorMessages: Array<{
    field: string
    message: string
    value?: any
  }> | null
  status: StagingStatus
  createdAt: string
  updatedAt: string
}

interface ManualImportState {
  // Current import session
  currentImport: {
    type: ImportType | null
    amazonAccountId: string | null
    marketplaceId: string | null
    file: File | null
  }

  // Staging rows
  stagingRows: StagingRow[]
  selectedRowIds: string[]

  // Upload status
  isUploading: boolean
  uploadProgress: number
  uploadError: string | null

  // Import statistics
  stats: {
    total: number
    valid: number
    invalid: number
    approved: number
    rejected: number
  }

  // Finalize status
  isFinalizing: boolean
  finalizeError: string | null
}

const initialState: ManualImportState = {
  currentImport: {
    type: null,
    amazonAccountId: null,
    marketplaceId: null,
    file: null,
  },
  stagingRows: [],
  selectedRowIds: [],
  isUploading: false,
  uploadProgress: 0,
  uploadError: null,
  stats: {
    total: 0,
    valid: 0,
    invalid: 0,
    approved: 0,
    rejected: 0,
  },
  isFinalizing: false,
  finalizeError: null,
}

const manualImportSlice = createSlice({
  name: 'manualImport',
  initialState,
  reducers: {
    // Set current import
    setCurrentImport: (
      state,
      action: PayloadAction<{
        type: ImportType | null
        amazonAccountId: string | null
        marketplaceId: string | null
        file: File | null
      }>
    ) => {
      state.currentImport = action.payload
    },

    // Set staging rows
    setStagingRows: (state, action: PayloadAction<StagingRow[]>) => {
      state.stagingRows = action.payload
      // Update stats
      state.stats.total = action.payload.length
      state.stats.valid = action.payload.filter((r) => r.validated).length
      state.stats.invalid = action.payload.filter((r) => !r.validated).length
      state.stats.approved = action.payload.filter((r) => r.status === 'approved').length
      state.stats.rejected = action.payload.filter((r) => r.status === 'rejected').length
    },

    // Add staging row
    addStagingRow: (state, action: PayloadAction<StagingRow>) => {
      state.stagingRows.push(action.payload)
      state.stats.total++
      if (action.payload.validated) {
        state.stats.valid++
      } else {
        state.stats.invalid++
      }
    },

    // Update staging row
    updateStagingRow: (state, action: PayloadAction<StagingRow>) => {
      const index = state.stagingRows.findIndex((r) => r.id === action.payload.id)
      if (index !== -1) {
        state.stagingRows[index] = action.payload
        // Update stats
        state.stats.approved = state.stagingRows.filter((r) => r.status === 'approved').length
        state.stats.rejected = state.stagingRows.filter((r) => r.status === 'rejected').length
      }
    },

    // Select/deselect rows
    toggleRowSelection: (state, action: PayloadAction<string>) => {
      const index = state.selectedRowIds.indexOf(action.payload)
      if (index === -1) {
        state.selectedRowIds.push(action.payload)
      } else {
        state.selectedRowIds.splice(index, 1)
      }
    },

    selectAllRows: (state) => {
      state.selectedRowIds = state.stagingRows.map((r) => r.id)
    },

    deselectAllRows: (state) => {
      state.selectedRowIds = []
    },

    // Upload status
    setUploading: (state, action: PayloadAction<boolean>) => {
      state.isUploading = action.payload
      if (!action.payload) {
        state.uploadProgress = 0
      }
    },

    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload
    },

    setUploadError: (state, action: PayloadAction<string | null>) => {
      state.uploadError = action.payload
    },

    // Finalize status
    setFinalizing: (state, action: PayloadAction<boolean>) => {
      state.isFinalizing = action.payload
      if (!action.payload) {
        state.finalizeError = null
      }
    },

    setFinalizeError: (state, action: PayloadAction<string | null>) => {
      state.finalizeError = action.payload
    },

    // Reset state
    resetImport: (state) => {
      state.currentImport = {
        type: null,
        amazonAccountId: null,
        marketplaceId: null,
        file: null,
      }
      state.stagingRows = []
      state.selectedRowIds = []
      state.uploadError = null
      state.finalizeError = null
      state.stats = {
        total: 0,
        valid: 0,
        invalid: 0,
        approved: 0,
        rejected: 0,
      }
    },
  },
})

export const {
  setCurrentImport,
  setStagingRows,
  addStagingRow,
  updateStagingRow,
  toggleRowSelection,
  selectAllRows,
  deselectAllRows,
  setUploading,
  setUploadProgress,
  setUploadError,
  setFinalizing,
  setFinalizeError,
  resetImport,
} = manualImportSlice.actions

export default manualImportSlice.reducer

