import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type CurrencyDisplayMode = 'base' | 'original'

interface CurrenciesState {
  baseCurrencyCode: string
  selectedCurrencyCode?: string
  displayMode: CurrencyDisplayMode
}

const initialState: CurrenciesState = {
  baseCurrencyCode: 'USD',
  selectedCurrencyCode: undefined,
  displayMode: 'base',
}

export const currenciesSlice = createSlice({
  name: 'currencies',
  initialState,
  reducers: {
    setBaseCurrencyCode: (state, action: PayloadAction<string>) => {
      state.baseCurrencyCode = action.payload
    },
    setSelectedCurrencyCode: (state, action: PayloadAction<string | undefined>) => {
      state.selectedCurrencyCode = action.payload
    },
    setDisplayMode: (state, action: PayloadAction<CurrencyDisplayMode>) => {
      state.displayMode = action.payload
    },
  },
})

export const { setBaseCurrencyCode, setSelectedCurrencyCode, setDisplayMode } =
  currenciesSlice.actions

export default currenciesSlice.reducer

