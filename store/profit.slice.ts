import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ProfitFilters } from '@/services/api/profit.api'

/**
 * Profit slice
 * 
 * Manages profit dashboard state and filters
 * RTK Query handles data fetching, this slice manages UI state
 */

interface ProfitState {
  filters: ProfitFilters
  activeBreakdown: 'product' | 'marketplace' | null
  // Future: Add real-time update flags, cache invalidation timestamps, etc.
}

const initialState: ProfitState = {
  filters: {
    period: 'day',
  },
  activeBreakdown: null,
}

const profitSlice = createSlice({
  name: 'profit',
  initialState,
  reducers: {
    /**
     * Update profit filters
     * Called when user changes filter values
     */
    setFilters: (state, action: PayloadAction<ProfitFilters>) => {
      state.filters = { ...state.filters, ...action.payload }
    },

    /**
     * Reset filters to default
     */
    resetFilters: (state) => {
      state.filters = {
        period: 'day',
      }
    },

    /**
     * Set active breakdown view
     */
    setActiveBreakdown: (
      state,
      action: PayloadAction<'product' | 'marketplace' | null>
    ) => {
      state.activeBreakdown = action.payload
    },
  },
})

export const { setFilters, resetFilters, setActiveBreakdown } = profitSlice.actions

export default profitSlice.reducer

