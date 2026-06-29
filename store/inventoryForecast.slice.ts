import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { InventoryForecastFilters } from '@/types/inventoryForecast.types'

interface InventoryForecastState {
  filters: InventoryForecastFilters
}

const initialState: InventoryForecastState = {
  filters: {
    accountId: '',
    marketplaceId: undefined,
    sku: '',
  },
}

export const inventoryForecastSlice = createSlice({
  name: 'inventoryForecast',
  initialState,
  reducers: {
    setForecastFilters: (state, action: PayloadAction<Partial<InventoryForecastFilters>>) => {
      state.filters = {
        ...state.filters,
        ...action.payload,
      }
    },
  },
})

export const { setForecastFilters } = inventoryForecastSlice.actions

export default inventoryForecastSlice.reducer

