import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ChartFilters, ChartMetric } from '@/services/api/charts.api'

interface ProfitChartsState {
  filters: ChartFilters
  comparisonMetric: ChartMetric
}

const initialState: ProfitChartsState = {
  filters: {
    period: 'month',
  },
  comparisonMetric: 'profit',
}

const profitChartsSlice = createSlice({
  name: 'profitCharts',
  initialState,
  reducers: {
    setChartFilters: (state, action: PayloadAction<ChartFilters>) => {
      state.filters = action.payload
    },
    setComparisonMetric: (state, action: PayloadAction<ChartMetric>) => {
      state.comparisonMetric = action.payload
    },
    resetChartFilters: (state) => {
      state.filters = { period: 'month' }
    },
  },
})

export const { setChartFilters, setComparisonMetric, resetChartFilters } = profitChartsSlice.actions

export default profitChartsSlice.reducer

