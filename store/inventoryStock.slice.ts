import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { InventoryStockFilters, StockStatus } from '@/types/inventoryStock.types'

interface InventoryStockState {
  filters: InventoryStockFilters
}

const initialState: InventoryStockState = {
  filters: {
    accountId: '',
    marketplaceId: undefined,
    sku: '',
    status: undefined,
    page: 1,
    limit: 25,
    includePendingShipments: true,
  },
}

export const inventoryStockSlice = createSlice({
  name: 'inventoryStock',
  initialState,
  reducers: {
    setInventoryFilters: (
      state,
      action: PayloadAction<Partial<InventoryStockFilters>>
    ) => {
      state.filters = {
        ...state.filters,
        ...action.payload,
      }
    },
    setInventoryStatus: (state, action: PayloadAction<StockStatus | undefined>) => {
      state.filters.status = action.payload
    },
  },
})

export const { setInventoryFilters, setInventoryStatus } = inventoryStockSlice.actions

export default inventoryStockSlice.reducer

