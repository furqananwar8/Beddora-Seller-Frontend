import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { InventoryKpiFilters, StockStatus } from '@/types/inventoryKpis.types'

interface InventoryKpiState {
  filters: InventoryKpiFilters
}

const initialState: InventoryKpiState = {
  filters: {
    accountId: '',
    marketplaceId: undefined,
    sku: '',
    status: undefined,
  },
}

export const inventoryKpiSlice = createSlice({
  name: 'inventoryKpi',
  initialState,
  reducers: {
    setInventoryKpiFilters: (state, action: PayloadAction<Partial<InventoryKpiFilters>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    setInventoryKpiStatus: (state, action: PayloadAction<StockStatus | undefined>) => {
      state.filters.status = action.payload
    },
  },
})

export const { setInventoryKpiFilters, setInventoryKpiStatus } = inventoryKpiSlice.actions

export default inventoryKpiSlice.reducer

