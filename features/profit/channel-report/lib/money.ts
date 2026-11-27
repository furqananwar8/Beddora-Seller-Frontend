import { createContext, useContext } from 'react'

import { formatMoney } from './format'

/** The currency the report's amounts are converted to; set by ChannelReport so every figure shows its symbol. */
export const ReportCurrencyContext = createContext<string | undefined>(undefined)

/** `formatMoney` bound to the report's currency. */
export const useMoney = () => {
  const currency = useContext(ReportCurrencyContext)
  return (amount: number | null | undefined) => formatMoney(amount, currency)
}
