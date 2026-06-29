import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { ReturnFilters } from '@/services/api/returns.api'

interface ProfitReturnsState {
  filters: ReturnFilters
}

const initialState: ProfitReturnsState = {
  filters: {
    period: 'day',
  },
}

const profitReturnsSlice = createSlice({
  name: 'profitReturns',
  initialState,
  reducers: {
    setReturnFilters: (state, action: PayloadAction<ReturnFilters>) => {
      state.filters = action.payload
    },
    resetReturnFilters: (state) => {
      state.filters = { period: 'day' }
    },
  },
})

export const { setReturnFilters, resetReturnFilters } = profitReturnsSlice.actions

export default profitReturnsSlice.reducer

