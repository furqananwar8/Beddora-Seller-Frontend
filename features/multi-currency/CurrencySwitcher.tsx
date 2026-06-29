'use client'

import React from 'react'
import { Currency } from '@/services/api/currency.api'

export interface CurrencySwitcherProps {
  currencies: Currency[]
  selectedCurrencyCode?: string
  displayMode: 'base' | 'original'
  onCurrencyChange: (code?: string) => void
  onDisplayModeChange: (mode: 'base' | 'original') => void
}

export const CurrencySwitcher: React.FC<CurrencySwitcherProps> = ({
  currencies,
  selectedCurrencyCode,
  displayMode,
  onCurrencyChange,
  onDisplayModeChange,
}) => {
  return (
    <div className="flex items-center gap-3">
      <select
        className="text-sm border border-border rounded px-3 py-2 bg-surface"
        value={selectedCurrencyCode || ''}
        onChange={(e) => onCurrencyChange(e.target.value || undefined)}
      >
        <option value="">Base Currency</option>
        {currencies.map((currency) => (
          <option key={currency.id} value={currency.code}>
            {currency.code} - {currency.name}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-2">
        <button
          className={`text-sm px-3 py-2 rounded border ${
            displayMode === 'base' ? 'bg-primary-600 text-white' : 'border-border'
          }`}
          onClick={() => onDisplayModeChange('base')}
        >
          Base
        </button>
        <button
          className={`text-sm px-3 py-2 rounded border ${
            displayMode === 'original' ? 'bg-primary-600 text-white' : 'border-border'
          }`}
          onClick={() => onDisplayModeChange('original')}
        >
          Original
        </button>
      </div>
    </div>
  )
}

