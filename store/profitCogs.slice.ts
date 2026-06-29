import { createSlice, PayloadAction } from '@reduxjs/toolkit'

/**
 * Profit COGS slice
 * 
 * Manages COGS state and UI interactions
 * RTK Query handles data fetching, this slice manages UI state
 */

interface ProfitCOGSState {
  selectedSKU: string | null
  selectedAccountId: string | null
  showForm: boolean
  editingCOGSId: string | null
  showHistorical: boolean
}

const initialState: ProfitCOGSState = {
  selectedSKU: null,
  selectedAccountId: null,
  showForm: false,
  editingCOGSId: null,
  showHistorical: false,
}

const profitCogsSlice = createSlice({
  name: 'profitCogs',
  initialState,
  reducers: {
    /**
     * Set selected SKU for COGS display
     */
    setSelectedSKU: (state, action: PayloadAction<string | null>) => {
      state.selectedSKU = action.payload
    },

    /**
     * Set selected account ID
     */
    setSelectedAccountId: (state, action: PayloadAction<string | null>) => {
      state.selectedAccountId = action.payload
    },

    /**
     * Show/hide COGS form
     */
    setShowForm: (state, action: PayloadAction<boolean>) => {
      state.showForm = action.payload
      if (!action.payload) {
        state.editingCOGSId = null
      }
    },

    /**
     * Set COGS entry being edited
     */
    setEditingCOGSId: (state, action: PayloadAction<string | null>) => {
      state.editingCOGSId = action.payload
      state.showForm = action.payload !== null
    },

    /**
     * Show/hide historical view
     */
    setShowHistorical: (state, action: PayloadAction<boolean>) => {
      state.showHistorical = action.payload
    },

    /**
     * Reset COGS state
     */
    resetCOGSState: (state) => {
      state.selectedSKU = null
      state.showForm = false
      state.editingCOGSId = null
      state.showHistorical = false
    },
  },
})

export const {
  setSelectedSKU,
  setSelectedAccountId,
  setShowForm,
  setEditingCOGSId,
  setShowHistorical,
  resetCOGSState,
} = profitCogsSlice.actions

export default profitCogsSlice.reducer

