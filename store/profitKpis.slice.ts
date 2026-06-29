import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { KPIFilters } from '@/services/api/kpis.api'

/**
 * Profit KPIs slice
 * 
 * Manages KPI dashboard state and filters
 * RTK Query handles data fetching, this slice manages UI state
 */

interface ProfitKPIsState {
  filters: KPIFilters
  activeKPI: 'units-sold' | 'returns-cost' | 'advertising-cost' | 'fba-fees' | 'payout-estimate' | null
  showDrillDown: boolean
}

const initialState: ProfitKPIsState = {
  filters: {
    period: 'day',
  },
  activeKPI: null,
  showDrillDown: false,
}

const profitKpisSlice = createSlice({
  name: 'profitKpis',
  initialState,
  reducers: {
    /**
     * Update KPI filters
     */
    setKPIFilters: (state, action: PayloadAction<KPIFilters>) => {
      state.filters = { ...state.filters, ...action.payload }
    },

    /**
     * Reset KPI filters to default
     */
    resetKPIFilters: (state) => {
      state.filters = {
        period: 'day',
      }
    },

    /**
     * Set active KPI for drill-down
     */
    setActiveKPI: (
      state,
      action: PayloadAction<
        'units-sold' | 'returns-cost' | 'advertising-cost' | 'fba-fees' | 'payout-estimate' | null
      >
    ) => {
      state.activeKPI = action.payload
      state.showDrillDown = action.payload !== null
    },

    /**
     * Toggle drill-down view
     */
    toggleDrillDown: (state) => {
      state.showDrillDown = !state.showDrillDown
    },
  },
})

export const { setKPIFilters, resetKPIFilters, setActiveKPI, toggleDrillDown } =
  profitKpisSlice.actions

export default profitKpisSlice.reducer

